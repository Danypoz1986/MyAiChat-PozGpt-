import React, { useRef, useState } from 'react';
import { View, 
         Text, 
         Pressable, 
         StyleSheet, 
         TouchableOpacity, 
         useWindowDimensions, 
         Image, 
         Alert } 
         from 'react-native';
import updateDarkMode from '../Components/DarkMode'
import { darkColors, lightColors } from '../../theme'
import FormInput from '../Components/FormInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { doc, deleteDoc, collection, getDocs, writeBatch, query, orderBy, startAfter, limit, updateDoc, getDoc } from 'firebase/firestore';
import Loader from '../Components/Loader';
import { auth, db } from '../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser, updateEmail, updatePassword, signOut, getAuth } from 'firebase/auth';
import { useNavigation, CommonActions } from '@react-navigation/native';


export default function AccountSettings() {
  const { darkMode } = updateDarkMode();
  const [mode, setMode] = useState('email');
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width -48, 520)
  const [loading, setLoading] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigation = useNavigation();
  const isTestUser = getAuth().currentUser?.email === 'test@test.test'
  
  
  async function deleteCollectionPaged(colRef, batchSize = 300) {
  let last = null;
  while (true) {
    const q = last
      ? query(colRef, orderBy('__name__'), startAfter(last), limit(batchSize))
      : query(colRef, orderBy('__name__'), limit(batchSize));

    const snap = await getDocs(q);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }
}

async function deleteUserTree(uid) {
  // list conversations
  const convsRef = collection(db, 'users', uid, 'conversations');
  const convsSnap = await getDocs(convsRef);

  // for each conversation: delete messages, then the conversation doc
  for (const convDoc of convsSnap.docs) {
    const msgsRef = collection(db, 'users', uid, 'conversations', convDoc.id, 'messages');
    await deleteCollectionPaged(msgsRef);
    await deleteDoc(convDoc.ref);
  }

  // finally delete the user doc
  await deleteDoc(doc(db, 'users', uid));
}



async function deleteAccountWithPassword(password) {
  setLoading(false)
  try {
    setLoading(true)
    const user = auth.currentUser;
    if (!user) throw new Error('No user is signed in');
    if (!password) throw new Error('Enter your current password.');
    if (!user.email) throw new Error('This account is not email/password (use provider re-auth).');

    // Re-authenticate
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);

    // Clean Firestore
    await deleteUserTree(user.uid);

    // Delete Auth user
    await deleteUser(user);

    Alert.alert('Done', 'Your account and data have been deleted.', [
  {
    text: 'OK',
    onPress: () => {
      // go up: AccountSettings(Stack) -> Drawer -> Root Stack
      const drawer = navigation.getParent();              // Drawer
      const root = drawer?.getParent();                   // Root Stack

      (root ?? navigation).dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Auth',                                // route in Root Stack
              state: {
                index: 0,
                routes: [{ name: 'LoginScreen' }],         // nested route inside Auth stack
              },
            },
          ],
        })
      );
    },
  },
]);

  } catch (e) {
    Alert.alert('Error', e?.message ?? String(e));
  }finally{
    setLoading(false)
    setCurrentPassword('');
  }
}



  const SegBtn = ({ value, label }) => {
    const active = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        style={[
          styles.segBtn,
          {
            backgroundColor: active ? 
            (!darkMode ? lightColors.success : darkColors.success) : 
            (!darkMode ? lightColors.error : darkColors.error),
          },
        ]}
      >
        <Text style={{ color: ! darkMode ? lightColors.card : darkColors.text, fontWeight: '700' }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, {backgroundColor: !darkMode ? lightColors.background : darkColors.background}]}>
      <Loader loading={loading} />

      {!isTestUser ? (

      <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
      >
        <View>
          <View style={{flexDirection: 'column', alignItems:'center', marginBottom:30}}>
              <Text style={[styles.text, {color: !darkMode ? lightColors.text : darkColors.textSecondary}]}>PozGPT</Text>
              <Image source={require("../../image/logo.png")} style={{width:250, height:50}}/>
          </View>
          {/* Segmented control */}
          <View style={[styles.segment, { backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, 
                        borderColor: lightColors.accent, width: maxWidth }]}>
            <SegBtn value="email" label="Change Email" />
            <SegBtn value="password" label="Change Password" />
          </View>

          {/* Content */}
          {mode === 'email' ? <ChangeEmailForm /> : <ChangePasswordForm  />}

        

          {!deleting ? (
          <TouchableOpacity style={[styles.btn, {backgroundColor: !darkMode ? lightColors.error : darkColors.error, marginTop:150, width:maxWidth}]}
            onPress={() => Alert.alert(
                            'Delete account',
                            'Are you sure to delete your account? This action cannot be undone.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => setDeleting(true) },
                            ],
                            { cancelable: true }
                        )}
          >
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <MaterialCommunityIcons name="skull-crossbones" size={24} color={'black'} />
                <Text style={[styles.btnText, {color:'black', marginLeft:5}]}>Delete account</Text>
            </View>
          </TouchableOpacity>
          ):( 
           <View style={{marginTop: 150,}}>
              <Text style={{marginBottom:10, fontSize: 16, color: !darkMode ? lightColors.text : darkColors.textSecondary, textAlign:'center'}}>
                Insert your password to delete account
              </Text>
                <FormInput onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={lightColors.textSecondary}/> 
              <Text style={{textAlign:'center', marginTop: 10, color: !darkMode? lightColors.error : darkColors.error}} 
              onPress={() => deleteAccountWithPassword(currentPassword)}
              >
                Delete Account
              </Text>

              <Text
                  style={{ textAlign: 'center', marginTop: 8, color: !darkMode ? lightColors.text : darkColors.text }}
                  onPress={() => { setDeleting(false); setCurrentPassword(''); }}
                >
      Cancel
      </Text>
          </View>
          )}
      
        </View>
      </ScrollView>
      ):(
      
        <View style={{flex: 1}}>
            <View style={{flexDirection: 'column', alignItems:'center', marginBottom:30}}>
              <Text style={[styles.text, {color: !darkMode ? lightColors.text : darkColors.textSecondary}]}>PozGPT</Text>
              <Image source={require("../../image/logo.png")} style={{width:250, height:50}}/>
          </View>
          <View style={{ justifyContent:'center', alignItems:'center', marginVertical:'auto'}}>
            <Text style={{color: !darkMode ? lightColors.text : darkColors.text }}>
              Password change and account deletion are disabled for the test user.
            </Text>
          </View>
         </View>)
    }
    </SafeAreaView>
  );
}

function ChangeEmailForm() {
    const passRef = useRef(null);
    const { width } = useWindowDimensions();
    const maxWidth = Math.min(width -48, 520)
    const { darkMode } = updateDarkMode();
    const [newEmail, SetNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('')
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    

    async function handleChangeEmail() {
      setLoading(false);
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('No user is signed in');
      if (!currentPassword) throw new Error('Enter your current password.');
      if (!newEmail) throw new Error('Enter a new email address.');
      if (!user.email) throw new Error('This account is not email/password');

      // Re-auth with the password the user typed
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      // Update email in Auth
      await updateEmail(user, newEmail);

      // (Optional) mirror in Firestore if you store email there
      try { await updateDoc(doc(db, 'users', user.uid), { email: newEmail }); } catch (_) {}

      Alert.alert('Email changed', 'Please log in again with your new email.', [
        {
          text: 'OK',
          onPress: async () => {
            await signOut(auth);
            const drawer = navigation.getParent();   // Drawer
            const root = drawer?.getParent();        // Root
            (root ?? navigation).dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  { name: 'Auth', state: { index: 0, routes: [{ name: 'LoginScreen' }] } },
                ],
              })
            );
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.message ?? String(e));
    }finally{
    setLoading(false);
    setCurrentPassword('');
    SetNewEmail('');
  }
  }

    return (
        <View style={[styles.card, { width: maxWidth, backgroundColor: !darkMode ? lightColors.card : darkColors.border, 
                      borderColor: !darkMode ? lightColors.accent : darkColors.textSecondary}]}>
            <Loader loading={loading}/>            
            <Text style={[styles.label, { color: !darkMode ? lightColors.accent : darkColors.text }]}>New email</Text>
            <FormInput
                value={newEmail}
                onChangeText={SetNewEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={{backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, borderColor:lightColors.accent}}
                onSubmitEditing={() => passRef.current?.focus()}
                error={false} // or set to true to show error border
                />
        
        <Text style={[styles.label, { color: !darkMode ? lightColors.accent : darkColors.text }]} >Current password</Text>
        <FormInput
            placeholder="••••••••"
            secureTextEntry
            style={{backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, borderColor:lightColors.accent}}
            onChangeText={setCurrentPassword}
        />
        <TouchableOpacity style={[styles.btn, {backgroundColor: !darkMode ? lightColors.accent : darkColors.headerBg}]}onPress={handleChangeEmail}>
            <Text style={[styles.btnText, {color: !darkMode ? lightColors.headerBg : darkColors.textSecondary}]}>Change Email</Text>
          </TouchableOpacity>
        </View>
    );
    }

function ChangePasswordForm() {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width -48, 520)
  const { darkMode } = updateDarkMode();
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
  setLoading(false)  
  try {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) throw new Error('No user is signed in');
    if (!user.email) throw new Error('This account is not email/password (use provider re-auth).');
    if (!currentPassword) throw new Error('Enter your current password.');
    if (!newPassword) throw new Error('Enter a new password.');
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) throw new Error('New password and confirmation do not match.');

    // Reauthenticate
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);

    // Update password
    await updatePassword(user, newPassword);

    Alert.alert('Password changed', 'Please log in again.', [
      {
        text: 'OK',
        onPress: async () => {
          await signOut(auth);
           navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Auth', state: { index: 0, routes: [{ name: 'LoginScreen' }] } }],
        })
  );
        },
      },
    ]);
  } catch (e) {
    Alert.alert('Error', e?.message ?? String(e));
  }finally{
    setLoading(false);
    setCurrentPassword('');
    setConfirmPassword('');
    setNewPassword('');
  }
}
    return (
        <View style={[styles.card, { width: maxWidth, backgroundColor: !darkMode ? lightColors.card : darkColors.border, 
                      borderColor: !darkMode ? lightColors.accent : darkColors.textSecondary}]}>
          <Loader loading={loading}/>
          <Text style={[styles.label, { color: !darkMode ? lightColors.accent : darkColors.text }]}>Current password</Text>
          <FormInput
              value={currentPassword}
              placeholder="••••••••"
              secureTextEntry
              style={{backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, borderColor:lightColors.accent}}
              onChangeText={setCurrentPassword}
          />
          <Text style={[styles.label, { color: !darkMode ? lightColors.accent : darkColors.text  }]}>New password</Text>
          <FormInput
              value={newPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              style={{backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, borderColor:lightColors.accent}}
              onChangeText={setNewPassword}
          />
          <Text style={[styles.label, { color: !darkMode ? lightColors.accent : darkColors.text }]}>Confirm new password</Text>
          <FormInput
              value={confirmPassword}
              placeholder="Repeat new password"
              secureTextEntry
              style={{backgroundColor: !darkMode ? lightColors.card : darkColors.textSecondary, borderColor:lightColors.accent}}
              onChangeText={setConfirmPassword}
          />
          <TouchableOpacity style={[styles.btn, {backgroundColor: !darkMode ? lightColors.accent : darkColors.headerBg}]} onPress={handleChangePassword}>
            <Text style={[styles.btnText, {color: !darkMode ? lightColors.headerBg : darkColors.textSecondary}]}>Change Password</Text>
          </TouchableOpacity>
        </View>
    );
    }


const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    padding: 16, 
    alignItems: 'center'
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  label: { fontWeight: '700', marginTop: 8 },
  text:{
    textAlign: 'center',
    fontSize: 30,
    margin:30,
    marginBottom: 0,
    fontWeight: 'bold'
  },
  btn: {
    height: 48,
    borderRadius: 14,
    backgroundColor:'yellow',
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 18
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120, // room for input area
  },
});
