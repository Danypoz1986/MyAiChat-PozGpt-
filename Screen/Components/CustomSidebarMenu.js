import React, { useEffect, useState, useRef} from 'react';
import {View, 
        Text, 
        Alert, 
        StyleSheet, 
        Image, 
        Pressable, 
        Modal, 
        TouchableOpacity, 
        useWindowDimensions
      } from 'react-native';
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, orderBy, query, getDocs, writeBatch, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from "../../firebaseConfig";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import updateDarkMode from './DarkMode'

import {
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { darkColors, lightColors } from '../../theme';


const CustomSidebarMenu = (props) => {

  const [userName, setUserName] = useState('');
  /** @type {{id: string, title: string}[]} */
  const [convos, setConvos] = useState([]);
  const { state, navigation, descriptors } = props;
  const avatarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const { width: screenW } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState(null);
  const { darkMode } = updateDarkMode();
  const onChatStack = state.routes[state.index]?.name === 'ChatScreenStack';
  const HIGHLIGHT_BG = onChatStack ? (!darkMode ? lightColors.headerBg : darkColors.textSecondary):'transparent';
  const HIGHLIGHT_FG = onChatStack? (!darkMode ? lightColors.text : darkColors.border):(!darkMode? lightColors.headerBg : darkColors.textSecondary);
  const NORMAL_BG    = 'transparent';
  const NORMAL_FG    = !darkMode ? lightColors.headerBg  : darkColors.textSecondary;
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatAnchor, setChatAnchor] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const [reloading, setReloading] = useState(false);

  
  

  const openMenu = () => {
    // measure avatar to anchor the popover
    avatarRef.current?.measureInWindow((x, y, w, h) => {
      setPos({ x, y, w, h });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  // popover width and clamped left position
  const POPOVER_W = 200;
  const left = Math.min(Math.max(pos.x, 8), screenW - POPOVER_W - 8);
  const top = pos.y + pos.h + 8;

  const openChatMenu = (e, chat) => {
  const { pageX, pageY } = e.nativeEvent;
  setChatTarget(chat);                 // {id, title}
  setChatAnchor({ x: pageX, y: pageY });
  setChatMenuOpen(true);
};
const closeChatMenu = () => {
  setChatMenuOpen(false);
  setChatAnchor(null);
  setChatTarget(null);
};

useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user)return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        setReloading(snap.exists() ? snap.data()?.reloading : false);
        console.log('Reloading', reloading);
        setTimeout(() => {
            updateDoc(doc(db, 'users', user.uid), {
              reloading: false,
              lastOpenedAt: serverTimestamp(),
            }).catch((e) => console.log('updateDoc error:', e));
          }, 300);
      } catch (e) {
        console.log(e);
      }
    });
    return unsub;
  }, [reloading]);


// Delete conversation (with messages)
const deleteConversation = async (convoId) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const convoRef = doc(db, 'users', uid, 'conversations', convoId);
  const msgsCol  = collection(convoRef, 'messages');

  // 1) delete subcollection messages (batch)
  const snap = await getDocs(msgsCol);
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  // 2) delete the conversation doc
  await deleteDoc(convoRef);
};


  useEffect(() => {
    const fetchName = onAuthStateChanged(auth, async(user) =>{
      if(!user){
        setUserName("")
      }
      try{
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if(snap.exists()){
          setUserName(snap.data()?.name)
        }else{
          setUserName("");
        }

      }catch(e){
        console.log("Profile fetch error:", e);
        setUserName("");
      }  
    })
    return () => fetchName();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
        collection(db, "users", uid, "conversations"),
        orderBy("startedAt", "desc")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setConvos(
        snap.docs.map(d => ({
            id: d.id,
            title: d.data()?.title ?? "Untitled chat"
        })

        )
      )
    });
    return unsub;
  },[]);
  

 return (
  <View
    style={
      !darkMode
        ? stylesSidebar.sideMenuContainer
        : [stylesSidebar.sideMenuContainer, { backgroundColor: darkColors.card }]
    }
  >
    <View
      style={
        !darkMode
          ? stylesSidebar.profileHeader
          : [stylesSidebar.profileHeader, { backgroundColor: darkColors.border }]
      }
    >
      <TouchableOpacity ref={avatarRef} onPress={openMenu} activeOpacity={0.7}>
        <Image source={require('../../image/149071.png')} style={{ width: 100, height: 100 }} />
      </TouchableOpacity>

      {/* Popover */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
  {/* backdrop to dismiss */}
  <Pressable style={StyleSheet.absoluteFill} onPress={close} />

  <View
    style={[
      stylesSidebar.panel,
      {
        top,
        left,
        width: POPOVER_W,
        backgroundColor: !darkMode ? lightColors.accent : darkColors.textSecondary,
        borderColor: !darkMode ? lightColors.headerBg : darkColors.text,
        
      },
    ]}
  >
    <Pressable
      onPress={() => {
        close();
        props.navigation.closeDrawer?.();
        requestAnimationFrame(() => {
          props.navigation.navigate('AccountSettingsScreenStack', {
            screen: 'AccountSettingsScreen',
          });
        });
      }}
      android_ripple={{
        foreground: true,
      }}
      style={({ pressed }) => [
        stylesSidebar.item,
        {
          width: '100%',
          alignSelf: 'stretch',

          borderRadius: 11,
          borderWidth: 1,
          borderColor: pressed 
          ? (!darkMode ? lightColors.accent : darkColors.border)
          : (!darkMode ? lightColors.headerBg : darkColors.border ),

          marginVertical: -6,
          marginHorizontal: 0, 
          backgroundColor: pressed
            ? (!darkMode ? lightColors.headerBg : darkColors.border)
            : 'transparent',
        },
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
          <MaterialCommunityIcons
            name="account"
            size={20}
            color={
              pressed
                ? (!darkMode ? lightColors.accent : darkColors.text)
                : (!darkMode ? lightColors.headerBg : darkColors.card)
            }
          />
          <Text
            style={[
              stylesSidebar.itemText,
              {
                color: pressed
                  ? (!darkMode ? lightColors.text : darkColors.text)
                  : (!darkMode ? lightColors.headerBg : darkColors.card),
              },
            ]}
          >
            Account Settings
          </Text>
        </View>
      )}
    </Pressable>

    {/* add more items if you want */}
    {/* <Pressable ...>More items</Pressable> */}
  </View>
</Modal>


      <Text
        style={
          !darkMode
            ? stylesSidebar.profileHeaderText
            : [stylesSidebar.profileHeaderText, { color: darkColors.text }]
        }
      >
        Hello, {userName}
      </Text>
    </View>

    <View
      style={
        !darkMode
          ? stylesSidebar.profileHeaderLine
          : [stylesSidebar.profileHeaderLine, { backgroundColor: darkColors.textSecondary }]
      }
    />

    <DrawerContentScrollView {...props}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const isChat = route.name === 'ChatScreenStack';
          const isAccountSettings = route.name === 'AccountSettingsScreenStack';
          const options = descriptors[route.key]?.options || {};
          const label =
            typeof options.drawerLabel === 'string'
              ? options.drawerLabel
              : options.title || route.name;
          if (isAccountSettings) return null;

          // Decide colors based on pressed/focused and "Chat only when pressed" rule
          const getColors = (pressed) => {
            if (isChat) {
              return {
                bg: pressed
                  ? !darkMode
                    ? lightColors.headerBg
                    : darkColors.textSecondary
                  : 'transparent',
                fg: pressed
                  ? !darkMode
                    ? lightColors.text
                    : darkColors.border
                  : !darkMode
                    ? lightColors.headerBg
                    : darkColors.textSecondary,
              };
            }
            // Other items: focused shows active styling
            return {
              bg: focused
                ? !darkMode
                  ? lightColors.headerBg
                  : darkColors.textSecondary
                : 'transparent',
              fg: focused
                ? !darkMode
                  ? lightColors.text
                  : darkColors.border
                : !darkMode
                  ? lightColors.headerBg
                  : darkColors.textSecondary,
            };
          };

          // Optional icon renderer from screen options
          const DrawerIcon = options.drawerIcon;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (isChat) {
                  navigation.closeDrawer();
                  navigation.navigate('ChatScreenStack', {
                    screen: 'ChatScreen',
                    params: { startNew: Date.now() },
                  });
                } else {
                  navigation.closeDrawer();
                  navigation.navigate(route.name);
                }
              }}
              android_ripple={{ foreground: true }}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  marginVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: getColors(pressed).bg,
                },
              ]}
            >
              {({ pressed }) => {
                const { fg } = getColors(pressed);
                return (
                  <>
                    {/* Icon (if provided in options) */}
                    {typeof DrawerIcon === 'function' ? (
                      <View style={{ marginRight: 12 }}>
                        {DrawerIcon({ color: fg, size: 24, focused })}
                      </View>
                    ) : null}

                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: fg,
                        flexShrink: 1,
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </>
                );
              }}
            </Pressable>
          );
        })}
      </View>

      <DrawerItem
        style={{ marginTop: 50, marginBottom: 50 }}
        label={({}) => <Text style={stylesSidebar.logoutText}>Logout</Text>}
        icon={({ color, size }) => (
          <MaterialCommunityIcons
            name="logout"
            marginLeft={-15}
            size={16}
            color={lightColors.accentText}
          />
        )}
        onPress={() => {
          props.navigation.toggleDrawer();
          Alert.alert(
            'Logout',
            'Are you sure? You want to logout?',
            [
              {
                text: 'Cancel',
                onPress: () => {
                  return null;
                },
              },
              {
                text: 'Confirm',
                onPress: async () => {
                  try {
                    await signOut(auth);
                    props.navigation.reset({
                      index: 0,
                      routes: [{ name: 'Auth' }],
                    });
                  } catch (e) {
                    Alert.alert('Logout failed', e?.message || 'Please try again.');
                  }
                },
              },
            ],
            { cancelable: false }
          );
        }}
      />

      <Text
        style={{
          marginLeft: 27,
          marginVertical: 12,
          fontSize: 22,
          color: !darkMode ? lightColors.headerBg : darkColors.textSecondary,
        }}
      >
        Chats
      </Text>

      {convos.map((c, idx) => {
        const selected = reloading ? idx===0 : selectedId === c.id;
        const isNewChat = (c.title || '').trim().toLowerCase() === 'new chat';
        return (
          <React.Fragment key={c.id}>
            <Pressable
            key={c.id}
            onPress={() => {
              if(reloading )setReloading(false)
              setSelectedId(c.id);
              props.navigation.navigate('ChatScreenStack', {
                screen: 'ChatScreen',
                params: { conId: c.id },
              });
            }}
            android_ripple={{ foreground: true }}
            style={({ pressed }) => [
              {
                paddingVertical: 11,
                marginHorizontal: 12,
                paddingLeft: 3,
                borderRadius: 16,
                marginVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: selected ? HIGHLIGHT_BG : pressed ? HIGHLIGHT_BG : NORMAL_BG,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: selected ? HIGHLIGHT_FG : NORMAL_FG,
                marginHorizontal: 12,
                flex: 1,                // <-- give the title the space, pushes dots to right
              }}
            >
              {c.title}
            </Text>

            {!isNewChat && (
            <TouchableOpacity
              onPress={(e) => openChatMenu(e, c)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ padding: 6, marginRight: 6 }}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color={selected ? HIGHLIGHT_FG : NORMAL_FG}
              />
            </TouchableOpacity>
          )}
        </Pressable>


           {chatMenuOpen && chatAnchor && chatTarget && (
  <Modal visible transparent animationType="fade" onRequestClose={closeChatMenu}>
  {/* backdrop to dismiss */}
  <Pressable style={StyleSheet.absoluteFill} onPress={closeChatMenu} />

  <View
    style={[
      stylesSidebar.panel,
      {
        top: Math.max(20, chatAnchor.y - 60),
        left: Math.min(Math.max(chatAnchor.x - 200, 8), screenW - 208),
        width: 200,
        backgroundColor: !darkMode ? lightColors.accent : darkColors.textSecondary,
        borderColor: !darkMode ? lightColors.headerBg : darkColors.text,
        position: 'absolute',
        overflow: 'hidden', // clip ripple/pressed bg to rounded edges
      },
    ]}
  >
    <Pressable
      onPress={() => {
        Alert.alert(
          'Delete chat',
          `Are you sure you want to delete “${chatTarget.title}”? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: closeChatMenu },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                closeChatMenu();
                setConvos(prev => prev.filter(v => v.id !== chatTarget.id));
                try {
                  await deleteConversation(chatTarget.id);
                  if (selectedId === chatTarget.id) {
                    setSelectedId(null);
                    props.navigation.navigate('ChatScreenStack', {
                      screen: 'ChatScreen',
                      params: { startNew: Date.now() },
                    });
                  }
                } catch (e) {
                  console.log('Delete chat error:', e);
                  Alert.alert('Failed to delete chat', 'Please try again.');
                }
              },
            },
          ],
          { cancelable: true }
        );
      }}
      android_ripple={{ foreground: true }}
      style={({ pressed }) => [
        stylesSidebar.item,
        {
          width: '100%',
          alignSelf: 'stretch',
          // match panel rounding and cover its vertical padding
          borderRadius: 12,
          marginVertical: -6,
          marginHorizontal: 0,

          // border only while pressed
          borderWidth: 1,
          borderColor: pressed
            ? (!darkMode ? lightColors.headerBg : darkColors.border)
            : (!darkMode ? lightColors.accent : darkColors.border),

          // pressed background
          backgroundColor: pressed
            ? (!darkMode ? lightColors.headerBg : darkColors.border)
            : 'transparent',
        },
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {({ pressed }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={
              pressed
                ? (!darkMode ? lightColors.accent : darkColors.text)
                : (!darkMode ? lightColors.headerBg : darkColors.card)
            }
          />
          <Text
            style={[
              stylesSidebar.itemText,
              {
                color: pressed
                  ? (!darkMode ? lightColors.text : darkColors.text)
                  : (!darkMode ? lightColors.headerBg : darkColors.card),
              },
            ]}
          >
            Delete Chat
          </Text>
        </View>
      )}
    </Pressable>
  </View>
</Modal>
)}
          </React.Fragment>
        );
      })}
    </DrawerContentScrollView>
  </View>
);
}
export default CustomSidebarMenu;

const stylesSidebar = StyleSheet.create({
  sideMenuContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: lightColors.text,
    paddingTop: 40,
    color: 'red',
  },
  profileHeader: {
    flexDirection: 'row',
    backgroundColor: lightColors.accent,
    padding: 15,
    textAlign: 'center',
  },
  profileHeaderText: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    fontWeight: 'bold',
    color: lightColors.headerBg
  },
  profileHeaderLine: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: lightColors.headerBg,
    marginTop: 15,
  },
  logoutText:{
    fontSize: 16, 
    color:lightColors.accentText, 
    marginLeft:-10
  },
  panel: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    // subtle shadow
    elevation: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow:'hidden'
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
});