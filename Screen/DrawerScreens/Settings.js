import React, { useEffect, useRef } from 'react';
import { View, Text, Switch, StyleSheet, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightColors, darkColors } from '../../theme';
import { auth, db } from '../../firebaseConfig';
import { setDoc, doc } from 'firebase/firestore';
import updateDarkMode from '../Components/DarkMode'
import { ScrollView } from 'react-native-gesture-handler';

const SettingsScreen = () => {
  const {darkMode, setDarkMode} = updateDarkMode();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width -100, 520)
  const scrollRef = useRef(null);
  
  

  useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const t = setTimeout(async () => {
    try {
      await setDoc(doc(db, 'users', uid), { darkMode }, { merge: true });
    } catch (e) { console.log(e); }
  }, 200); // 200ms debounce

  return () => clearTimeout(t);
}, [darkMode]);

  return (
    <SafeAreaView style={!darkMode ? styles.screen : [styles.screen,{backgroundColor:darkColors.background}]}>

      <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
      >
      
          <View style={{flexDirection: 'column', alignItems:'center', marginBottom:30}}>
              <Text style={[styles.text, {color: !darkMode ? lightColors.text : darkColors.textSecondary}]}>PozGPT</Text>
              <Image source={require("../../image/logo.png")} style={{width:250, height:50}}/>
          </View>
          
          {/* Toggles */}
          <View style={!darkMode ? [styles.card, {width:maxWidth}] : [styles.card, {backgroundColor: darkColors.border, width: maxWidth}]}>
            <View style={styles.row}>
              <Text style={!darkMode ? styles.label : [styles.label, {color: darkColors.text}]}>Dark Mode</Text>
              <Switch
                style={{marginRight: -25}}
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor={'#ffffff'}
                trackColor={{ false: '#c9d1e1', true: lightColors.accent }}  
              />
            </View>

            
          </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: lightColors.background,
    padding: 30,
    alignItems: 'center'
  },
  card: {
    backgroundColor: lightColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.border,
    padding: 40,
    gap: 10,
    // subtle shadow (Android/iOS)
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 16,
    color: lightColors.text,
    fontWeight:  '600',
    marginLeft: -25
  },
  supportBtn: {
    marginTop: 20,
    backgroundColor: '#e03131', // ✅ red button
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  supportText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  note: {
    marginTop: 16,
    textAlign: 'center',
    color: '#6b7b8c',
    fontSize: 12,
  },
  text:{
    textAlign: 'center',
    fontSize: 30,
    margin:30,
    marginBottom: 0,
    color: lightColors.text,
    fontWeight: 'bold'
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 30,
  }
});



