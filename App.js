import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';

import { lightColors } from './theme';
import { auth } from './firebaseConfig';
import { markBackgrounded } from './Screen/Components/chat';

import SplashScreen from './Screen/SplashScreen';
import LoginScreen from './Screen/LoginScreen';
import RegisterScreen from './Screen/RegisterScreen';
import DrawerNavigationRoutes from './Screen/DrawerNavigationRoutes';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator initialRouteName="LoginScreen">
    <Stack.Screen
      name="LoginScreen"
      component={LoginScreen}
      options={{
        title: 'Login',
        headerStyle: { backgroundColor: lightColors.headerBg },
        headerTintColor: lightColors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
    <Stack.Screen
      name="RegisterScreen"
      component={RegisterScreen}
      options={{
        title: 'Register',
        headerStyle: { backgroundColor: lightColors.headerBg },
        headerTintColor: lightColors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    />
  </Stack.Navigator>
);

function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  // App backgrounding hook
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev === 'active' && (next === 'inactive' || next === 'background')) {
        // fire-and-forget
        markBackgrounded();
      }
      prev = next;
    });
    return () => sub.remove();
  }, []);

  // Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Show splash while auth is loading */}
          {user === undefined ? (
            <Stack.Screen name="SplashScreen" component={SplashScreen} />
          ) : user ? (
            <Stack.Screen name="DrawerNavigationRoutes" component={DrawerNavigationRoutes} />
          ) : (
            <Stack.Screen name="Auth" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
