import React, {useState, useRef} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Loader from './Components/Loader';
import { lightColors } from '../theme';
import FormInput from '../Screen/Components/FormInput'

const LoginScreen = ({navigation}) => {
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const passRef = useRef(null);

  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width -48, 520)

  const isLandscape = width > height
  
  const handleLogin = async () => {
  setErrorMsg("");
  if (!userEmail) {
    alert("Please fill Email");
    return;
  }
  if (!userPassword) {
    alert("Please fill Password");
    return;
  }

  setLoading(true);
  try {
    // 1) Sign in with Firebase Auth
    const cred = await signInWithEmailAndPassword(
      auth,
      userEmail.trim(),
      userPassword
    );
    const uid = cred.user.uid;

    // 2) Fetch user profile from Firestore (optional but matches your previous flow)
    const snap = await getDoc(doc(db, "users", uid));
    const profile = snap.exists() ? snap.data() : {};

    // 3) Save what you need locally (avoid sensitive data if possible)
    await AsyncStorage.multiSet([
      ["user_name", profile?.name ?? ""],
      ["user_email", cred.user.email ?? ""],
    ]);

    // 4) Navigate to your app
    navigation.replace("DrawerNavigationRoutes");
  } catch (e) {
    // Friendly errors
    console.log("Login error:", e.code, e.message);
    let msg = "Login failed. Please try again.";
    if (e.code === "auth/invalid-email") msg = "Invalid email address.";
    if (e.code === "auth/user-disabled") msg = "This account is disabled.";
    if (e.code === "auth/user-not-found") msg = "No account found with this email.";
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
      msg = "Incorrect email or password.";
    if (e.code === "auth/network-request-failed")
      msg = "Network error. Check your connection.";

    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={[styles.pageContainer]}>
      <ScrollView
        showsVerticalScrollIndicator={isLandscape}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
        padding: 24,
        minHeight: '100%',   // <— ensures content can scroll when space shrinks
      }}
      >
        
          <View style={{flexDirection: 'column', alignItems:'center', marginBottom:30}}>
              <Text style={[styles.text, {color: lightColors.text }]}>PozGPT</Text>
              <Image source={require("../image/logo.png")} style={{width:250, height:50}}/>
          </View>

          <View style={[styles.card, { width: cardWidth }]}>
            <FormInput
              value={userEmail}
              onChangeText={setUserEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              error={false} // or set to true to show error border
            />
            <FormInput
              ref={passRef}
              value={userPassword}
              onChangeText={setUserPassword}
              placeholder="Password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              error={!!errorMsg}
            />

            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

            <TouchableOpacity onPress={handleLogin} style={[styles.btn, { backgroundColor: lightColors.accent }]}>
              <Text style={{ color: lightColors.accentText, fontWeight: "700" }}>Login</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.text, {fontSize: 15, fontWeight: 'normal'}]}
            onPress={() => navigation.navigate('RegisterScreen')}
          >
            New here? Register
          </Text>

          <Loader loading = {loading} style={{marginTop: 100}}/>
        
      </ScrollView>
    </SafeAreaView>
  );
};
export default LoginScreen;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginHorizontal: 24,
    alignSelf: "center",
    backgroundColor: lightColors.card, 
    borderColor: lightColors.border,
    gap: 14
  },
  btn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  error: {
    color: lightColors.error,
    marginTop: 8,
    textAlign: "center",
  },
  pageContainer: {
    backgroundColor: lightColors.background,
    flex: 1
  },
  text:{
    textAlign: 'center',
    fontSize: 30,
    margin:30,
    marginBottom: 0,
    color: lightColors.text,
    fontWeight: 'bold'
  }

});