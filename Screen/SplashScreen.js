import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig"; // or "../firebase"
import Loader from '../Screen/Components/Loader'
import { lightColors } from "../theme";

export default function SplashScreen({ navigation }) {
  const [authReady, setAuthReady] = useState(false);
  const [animReady, setAnimReady] = useState(false);

  const scale = useRef(new Animated.Value(0.8)).current;   // start smaller
  const opacity = useRef(new Animated.Value(0.6)).current; // start dim

  // One-time grow animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setAnimReady(true));
  }, [opacity, scale]);

  // Auth gate
  useEffect(() => {
    const minDelay = new Promise((r) => setTimeout(r, 3000)); // optional
    const unsub = onAuthStateChanged(auth, async (user) => {
      await minDelay;
      setAuthReady(user ? "in" : "out"); // mark where to go
    });
    return unsub;
  }, []);

  // Navigate when both are ready
  useEffect(() => {
    if (!animReady || !authReady) return;
    navigation.replace(authReady === "in" ? "DrawerNavigationRoutes" : "Auth");
  }, [animReady, authReady, navigation]);

  return (
    <View style={styles.pageContainer}>
      <Animated.Text
        style={[
          styles.text,
          { opacity, transform: [{ scale }] },
        ]}
      >
        PozGPT
      </Animated.Text>

      <Loader containerStyle={{ paddingBottom: 200, justifyContent: 'flex-end' }}/>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: lightColors.background },
  text: { color: lightColors.text, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  activityIndicator: { height: 80 },
});
