import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Image,
  Modal,
  Animated
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { darkColors, lightColors } from '../../theme';
import sendMessageToOpenSourceAI from '../../sendMessageToOpenSourceAI';
import {
  startNewChatIfNeeded,
  ensureActiveConvo,
  saveChatMessage,
  fetchMessages,
  clearBackgrounded,
} from '../../Screen/Components/chat';
import updateDarkMode from '../Components/DarkMode'


const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { darkMode } = updateDarkMode();
  const boxBg = darkMode ? darkColors.textSecondary : lightColors.text;
  const [gender, setGender] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [convoId, setConvoId] = useState(null);
  const { width, height } = useWindowDimensions();
  const isLandscape = width>height;
  const reloadTimerRef = useRef(null);
  
  const scrollRef = useRef(null);

  // single-flight guards for handleNewChat
  const newChatInFlightRef = useRef(null); // holds a Promise or null
  const isStartingNewRef = useRef(false);  // quick boolean guard

  const youLabel =
    gender === 'male' ? '👨‍🦰 You' : gender === 'female' ? '👩‍🦰 You' : '🧑 You';

  // Auto-scroll when messages change
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const flipReloading = useCallback(async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);

  try {
    await updateDoc(doc(db, 'users', uid), {
      reloading: true,
      lastOpenedAt: serverTimestamp(),
    });
  } catch {}

  reloadTimerRef.current = setTimeout(async () => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        reloading: false,
        lastOpenedAt: serverTimestamp(),
      });
    } catch {}
  }, 500);
}, []);

const setCurrentConvoOnUser = useCallback(async (id) => {
  const uid = auth.currentUser?.uid;
  if (!uid || !id) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      currentConvoId: id,
      lastOpenedAt: serverTimestamp(),
    });
  } catch (e) {
    console.log('setCurrentConvoOnUser error:', e);
  }
}, []);


useFocusEffect(
  React.useCallback(() => {
    flipReloading();
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [flipReloading])
);


  // Bootstrap on auth changes (once per auth session)
 useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setGender(null);
        setConvoId(null);
        setMessages([]);
        return;
      }

      try {
        // gender
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        setGender(snap.exists() ? snap.data()?.gender ?? null : null);

        // use the same "start new chat if needed" logic used elsewhere
        await handleNewChat({ force: false });
      } catch (e) {
        console.log('Init chat error:', e);
      }
    });
    return unsub;
  }, [handleNewChat]);


  // Idempotent & single-flight "start/switch chat"
  const handleNewChat = useCallback(
    async (opts = {}) => {
      const { targetId, force = false } = opts;

      // if another run is in-flight, wait for it
      if (newChatInFlightRef.current) {
        try { newChatInFlightRef.current; } catch {}
      }
      if (isStartingNewRef.current) return;
      isStartingNewRef.current = true;

      const run = (async () => {
        try {
          let id = targetId || null;

          if (!id) {
            id = await startNewChatIfNeeded();
          } else {
            // verify targetId exists before switching
            const uid = auth.currentUser?.uid;
            if (uid) {
              const ref = doc(db, 'users', uid, 'conversations', id);
              const snap = await getDoc(ref);
              if (!snap.exists()) {
                console.log('handleNewChat: target convo not found, aborting');
                return;
              }
            }
          }

          if (!id) return;
          if (id === convoId && !force) return;

          setConvoId(id);
          setCurrentConvoOnUser(id);
          flipReloading();          

          const history = await fetchMessages(id);
          setMessages(history.map(({ role, content }) => ({ role, content })));
          setInput('');
        } catch (e) {
          console.log('New chat error:', e);
        }
      })();

      newChatInFlightRef.current = run;
      try { await run; } finally {
        newChatInFlightRef.current = null;
        isStartingNewRef.current = false;
      }
    },
    
    [convoId]
  );

  // If route provides a specific conversation, open it
  useEffect(() => {
    (async () => {
      const conId = route?.params?.conId;
      const uid = auth.currentUser?.uid;
      if (!uid || !conId) return;
      flipReloading();
      await handleNewChat({ targetId: conId, force: true });
    })();
  }, [route?.params?.conId, handleNewChat]);

  const handleSend = useCallback(async () => {
    setAnswering(false);
    const text = (input || '').trim();
    if (!text) return;

    // ensure a convo exists if user types fast
    let id = convoId;
    if (!id) {
      id = await ensureActiveConvo();
      setConvoId(id);
    }
    if (!id) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');

    // persist user message
    try {
      await saveChatMessage({ role: 'user', content: text }, id);
    } catch (e) {
      console.log('Save user message error:', e);
    }

    // ask the model
    try {
      setLoading(true);
      const aiReply = await sendMessageToOpenSourceAI(next);
      const reply =
        aiReply && aiReply.role && aiReply.content
          ? aiReply
          : { role: 'assistant', content: String(aiReply ?? '') };

      setMessages((prev) => [...prev, reply]);

      try {
        await saveChatMessage(reply, id);
      } catch (e) {
        console.log('Save assistant message error:', e);
      }
    } catch (err) {
      console.error('AI error:', err);
      const fallback = { role: 'assistant', content: 'Error in the AI’s response.' };
      setMessages((prev) => [...prev, fallback]);
      try { await saveChatMessage(fallback, id); } catch {}
    } finally {
      setLoading(false);
      setAnswering(true);
    }
  }, [input, messages, convoId]);

  // startNew flag from navigation
  useFocusEffect(
    useCallback(() => {
      const startNew = route?.params?.startNew;
      if (!startNew) return;
      flipReloading();
      handleNewChat();
      navigation.setParams({ startNew: undefined });
    }, [route?.params?.startNew, navigation, handleNewChat])
  );

  // wasBackgrounded -> clear + new chat
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const snap = await getDoc(doc(db, 'users', uid));
        const wasBg = snap.exists() && snap.data().wasBackgrounded === true;
        if (wasBg) {
          await clearBackgrounded();
          await handleNewChat();
        }
      })();
    }, [handleNewChat])
  );

  const TypingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDot = (dot, delay) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Animated.Text style={[styles.dot, { opacity: dot1, color: !darkMode ? lightColors.headerBg : darkColors.surface }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2, color: !darkMode ? lightColors.headerBg : darkColors.surface }]}>•</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3, color: !darkMode ? lightColors.headerBg : darkColors.surface }]}>•</Animated.Text>
    </View>
  );
};
  

  return (
    <SafeAreaView style={styles.safe}>
      <View style={!darkMode ? styles.page : [styles.page, {backgroundColor : darkColors.background }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={styles.watermarkWrap}>
      <Text
        style={[
          styles.watermarkText,
          { color: darkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.15)' }
        ]}
      >
        PozGPT
      </Text>
      <Image
        source={require('../../image/logo.png')}
        style={[
          styles.watermarkLogo,
          darkMode && { tintColor: '#FFFFFF' } // optional: white tint on dark
        ]}
      />
    </View>
  </View>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const label = !auth.currentUser
              ? isUser ? '❓ You' : '🤖 DeepSeek'
              : isUser ? youLabel : '🤖 DeepSeek';

            return (
              <View
                key={i}
                style={[isLandscape ? styles.bubbleLandscape : styles.bubblePortrait , isUser ? 
                  (!darkMode ? styles.userBubble : [styles.userBubble,{backgroundColor: darkColors.bubbleUser}]) : 
                  (!darkMode ? styles.assistantBubble : [styles.assistantBubble, {backgroundColor: darkColors.bubbleBot}])]}
              >
                <Text style={[styles.name, isUser ? 
                  (!darkMode ? styles.userName : [styles.userName, {color: darkColors.textSecondary}]) : 
                  (!darkMode ? styles.assistantName : [styles.assistantName, {color: darkColors.textSecondary}])]}>
                  {label}
                </Text>

                {/* keep newlines from the model */}
                <Text style={!darkMode ? styles.message : [styles.message, {color: darkColors.textSecondary}]}>
                  {msg.content.split('\n').map((line, idx, arr) => (
                    <Text key={idx}>
                      {line}
                      {idx < arr.length - 1 ? '\n' : ''}
                    </Text>
                  ))}
                </Text>
              </View>
            );
          })}

          {loading && answering && (
            <View style={[styles.bubble, styles.assistantBubble]}>
              <Text style={[styles.name, styles.assistantName]}>🤖 DeepSeek</Text>
              <View style={{ height: 8 }} />
            </View>
          )}
        </ScrollView>

        {/* input bar */}
        <View style={!darkMode ? styles.inputWrap : [styles.inputWrap, {backgroundColor: 'black'}]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Write a message..."
            placeholderTextColor={!darkMode ? lightColors.text : darkColors.text}
            multiline
            style={!darkMode ? styles.textarea : [styles.textarea, {backgroundColor: darkColors.card, color: darkColors.text}]}
          />
          <TouchableOpacity onPress={handleSend} style={!darkMode ? styles.btn : [styles.btn, {backgroundColor: darkColors.border }]}>
            <Text style={{ color: !darkMode ? lightColors.headerBg : darkColors.text, fontWeight: '700' }}>Send</Text>
          </TouchableOpacity>
        </View>

        <View>
            <Modal transparent animationType="none" visible={loading}>
                  <View
                    style={[
                      styles.modalBackground
                    ]}
                  >
                    <View
                      style={[
                        styles.activityIndicatorWrapper,
                        { backgroundColor: boxBg, color: !darkMode ? lightColors.headerBg : darkColors.surface },
                      ]}
                    >
                      <Text style={[styles.loaderText,{color: !darkMode ? lightColors.headerBg : darkColors.surface}]}>Answering</Text>
                      <View style={styles.dotsContainer}>
                        <TypingDots />  
                      </View>
                    </View>
                  </View>
                </Modal>
        </View>

      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: lightColors.background,
  },
  page: {
    flex: 1,
    backgroundColor: lightColors.background,
    paddingBottom: 100,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120, // room for input area
  },
  
  bubblePortrait: {
    maxWidth: '75%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  
  bubbleLandscape: {
    maxWidth: '55%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: lightColors.bubbleUser,
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: lightColors.bubbleBot,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },

  name: { fontWeight: '700', marginBottom: 4 },
  userName: { color: lightColors.success },
  assistantName: { color: lightColors.accent },
  message: { color: lightColors.text, lineHeight: 20 },

  // input area
  inputWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: lightColors.text,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  textarea: {
    minHeight: 70,
    maxHeight: 150,
    backgroundColor: lightColors.card,
    color: lightColors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  btn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    backgroundColor: lightColors.accent,
  },

  bgImage: {
    opacity: 0.1,           // watermark strength
    resizeMode: 'contain',
    alignSelf: 'center',
    width: '65%',            // tame the size in landscape
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    position: 'absolute',
    bottom: '28%',           // push text a bit up from bottom-center
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // For absolute watermark
  watermarkWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,                 // RN 0.71+; otherwise use marginTop on text
  },
  watermarkLogo: {
    width: '52%',
    aspectRatio: 1.3,
    resizeMode: 'contain',
    opacity: 0.1,
  },
  watermarkText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
    color: 'rgba(0,0,0,0.15)', // override in dark mode:
    // color: 'rgba(255,255,255,0.16)',
    marginBottom: -60
  },
  watermarkStack: {
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIndicatorWrapper: {
    height: 50,
    width: 200,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },

  loaderText:{
    fontSize: 20,
    fontweight: 'bold'
  },
  
  dotsContainer: {
  flexDirection: 'row',
  marginTop: 8,
},

dot: {
  fontSize: 22,
  marginHorizontal: 2,
}

});