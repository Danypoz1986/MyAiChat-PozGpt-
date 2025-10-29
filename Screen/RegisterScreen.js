import React, {useState, useRef,} from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  Keyboard,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform
} from 'react-native';
import { lightColors } from "../theme";
import Loader from './Components/Loader'
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from './Components/FormInput';

import { Picker } from "@react-native-picker/picker";

const RegisterScreen = ({ navigation }) => {

    const[userName, setUserName] = useState('');
    const[userEmail, setUserEmail] = useState('');
    const[userPassword, setUserPassword] = useState('');
    const[userRepeatedPassword, setUserRepeatedPassword] = useState('');
    const[gender, setGender] = useState("");

    const[loading, setLoading] = useState(false);
    const[errortext, setErrortext] = useState('');
    const[isRegistrationSuccess, 
        setIsRegistrationSuccess] = useState(false);
    
    const nameRef = useRef(null);
    const emailRef = useRef(null);
    const passRef = useRef(null);
    const confirmRef = useRef(null);
    
    const { width, height } = useWindowDimensions();
    const cardWidth = Math.min(width -48, 520)

    const isLandscape = width > height;

    const handleRegister = async () => {

    setErrortext("");
    Keyboard.dismiss();

    if (!userName) return alert("Please fill Name");
    if (!userEmail) return alert("Please fill Email");
    if (!userPassword) return alert("Please fill Account");
    if (!userRepeatedPassword) return alert("Please confirm your password");
    if (!gender) return alert("Please select the gender");

    if(userPassword !== userRepeatedPassword) return alert("Passwords must match")

    setLoading(true);
      try {
      const cred = await createUserWithEmailAndPassword(auth, userEmail.trim(), userPassword.trim());
      const firstName = userName.trim().replace(/\s+/g, " ").split(" ")[0] || "";;

      // 3) Profile in Firestore (do NOT store password)
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          name: firstName.trim(),
          email: userEmail.trim(),
          gender,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

        setIsRegistrationSuccess(true);
      } catch (e) {
         console.log("Login error:", e.code, e.message); 
         setErrortext(e.code);
      }
      finally{
        setLoading(false);
      }
      
  };


    if(isRegistrationSuccess){
     return (
        <View style={[styles.imageContainer, { backgroundColor: lightColors.background }]}>
            <Image
                style={styles.image}
                source={require("../image/pngwing.com.png")}
            />

            <View>
                <Text style={styles.successTextStyle}>
                    Registration Successful
                </Text>

                <TouchableOpacity
                onPress={() => navigation.navigate("LoginScreen")}
                activeOpacity={0.8}
                style={[styles.btn, { backgroundColor: lightColors.accent, marginTop:30 }]}
                >
                <Text style={[styles.buttonTextStyle, { color: lightColors.accentText }]}>
                    Login Now
                </Text>
                </TouchableOpacity>
            </View>
        </View>
     );
    }


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
                      ref={nameRef}
                      value={userName}
                      onChangeText={setUserName}
                      placeholder="Insert your name"
                      keyboardType="default"
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={false} // or set to true to show error border
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />

                    <FormInput
                      ref={emailRef}
                      value={userEmail}
                      onChangeText={setUserEmail}
                      placeholder="Insert your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={false} // or set to true to show error border
                      blurOnSubmit={false}
                      onSubmitEditing={() => passRef.current?.focus()}
                    />

                    <FormInput
                      ref={passRef}
                      value={userPassword}
                      onChangeText={setUserPassword}
                      placeholder="Insert your password"
                      keyboardType="default"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={false} // or set to true to show error border
                      blurOnSubmit={false}
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />

                    <FormInput
                      ref={confirmRef}
                      value={userRepeatedPassword}
                      onChangeText={setUserRepeatedPassword}
                      placeholder="Confirm your password"
                      keyboardType="default"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={false} // or set to true to show error border
                      onSubmitEditing={() => {
                          confirmRef.current?.blur?.();
                          Keyboard.dismiss();
                        }}
                    />

                    <View style={styles.inlineRow}
                    onSubmitEditing={() => {
                          confirmRef.current?.blur?.();
                          Keyboard.dismiss();
                        }}
                    >
                      <Text>Gender </Text>
                      <View style={styles.genderSelector}>
                        <Picker
                        selectedValue={gender}
                        onValueChange={(g, Index) =>
                          setGender(g)
                        }
                        dropdownIconColor={lightColors.textSecondary}
                        style={styles.picker}   
                        >
                          <Picker.Item label='Select an option' value='' color={lightColors.textSecondary} />
                          <Picker.Item label='male' value='male' color={lightColors.text} />
                          <Picker.Item label='female' value='female' color={lightColors.text} />
                          <Picker.Item label='non binary' value='nonBinary' color={lightColors.text} />
                          <Picker.Item label='prefer not to say' value='na' color={lightColors.text} />
                        </Picker>  
                      </View>
                    </View>


                    {errortext ? <Text style={styles.error}>{errortext}</Text> : null}
                    
                    <TouchableOpacity onPress={handleRegister} style={[styles.btn, { backgroundColor: lightColors.accent }]}>
                        <Text style={{ color: lightColors.accentText, fontWeight: "700" }}>Register</Text>
                    </TouchableOpacity>
                
              </View>

              <Loader loading = {loading} />           

            </ScrollView>
          </SafeAreaView>
        
    
 );

}

export default RegisterScreen;

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
  },
  text:{
    textAlign: 'center',
    fontSize: 30,
    margin:30,
    marginBottom: 0,
    color: lightColors.text,
    fontWeight: 'bold'
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft:7,
    
    
  },
  fieldLabel: {
    width: 70,                 // keeps label tight on the left
    color: lightColors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  
  genderSelector: {
    width:220,
    height: 48,
    paddingInline:16,
    borderWidth: 1.5,
    borderRadius: 24,
    borderColor: lightColors.border
  },

  picker: {
    height: 55,                  // match box height
    width: "100%",
    ...Platform.select({
      android: { marginTop: -6 }, // tiny upward nudge (works; marginBottom doesn’t)
      ios: {},
    }),
  },

  image: {
    width: 200,
    height: 200
  },

  imageContainer:{
    flex: 1,
    alignItems:'center',
    justifyContent: 'center'
  },

  successTextStyle:{
    color: lightColors.success,
    marginTop: 10,
    fontSize: 20,
  }

});