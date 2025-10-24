import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import updateDarkMode from '../Screen/Components/DarkMode'


// Import Navigators from React Navigation
import {createStackNavigator} from '@react-navigation/stack';
import {createDrawerNavigator} from '@react-navigation/drawer';

// Import Screens
import ChatScreen from './DrawerScreens/Chat';
import SettingsScreen from './DrawerScreens/Settings';
import AccountSettingsScreen from './DrawerScreens/AccountSettings';
import CustomSidebarMenu from './Components/CustomSidebarMenu';
import NavigationDrawerHeader from './Components/NavigationDrawerHeader';
import { darkColors, lightColors } from '../theme'

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();


const ChatScreenStack = ({ navigation }) => {
  const { darkMode } = updateDarkMode();

  return (
    <Stack.Navigator initialRouteName="ChatScreen">
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          title: 'Chat',
          headerLeft: () => <NavigationDrawerHeader navigationProps={navigation} />,
          headerStyle: {
            backgroundColor: !darkMode ?  lightColors.headerBg : darkColors.border,
          },
          headerTintColor: !darkMode ?  lightColors.text : darkColors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
};

const SettingsScreenStack = ({ navigation }) => {
  const { darkMode } = updateDarkMode(); 
  return (
    <Stack.Navigator initialRouteName="SettingsScreen">
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: 'UI Settings',
         headerLeft: () => (
          <NavigationDrawerHeader navigationProps={navigation} />
        ),
          headerStyle: { backgroundColor: !darkMode ? lightColors.headerBg : darkColors.border },
          headerTintColor: !darkMode ? lightColors.text : darkColors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
};

const AccountSettingsScreenStack = ({ navigation }) => {
  const { darkMode } = updateDarkMode(); 
  return (
    <Stack.Navigator initialRouteName="AccountSettingsScreen">
      <Stack.Screen
        name="AccountSettingsScreen"
        component={AccountSettingsScreen}
        options={{
          title: 'Account Settings',
         headerLeft: () => (
          <NavigationDrawerHeader navigationProps={navigation} />
        ),
          headerStyle: { backgroundColor: !darkMode ? lightColors.headerBg : darkColors.border },
          headerTintColor: !darkMode ? lightColors.text : darkColors.text,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
};

const DrawerNavigatorRoutes = () => {
  return (
    <Drawer.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        
      })}
      // Pressed-only visuals live inside this custom drawer
      drawerContent={(p) => <CustomSidebarMenu {...p} />}
    >
      <Drawer.Screen
        name="ChatScreenStack"
        component={ChatScreenStack}
        options={{
          drawerLabel: 'New Chat',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat-plus-outline" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: () => {
            navigation.navigate('ChatScreenStack', {
              screen: 'ChatScreen',
              params: { startNew: Date.now() },
            });
          },
        })}
      />
      <Drawer.Screen
        name="SettingsScreenStack"
        component={SettingsScreenStack}
        options={{
          drawerLabel: 'UI Settings',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: () => {
            navigation.navigate('AccountSettingsScreenStack ', {
              screen: 'AccountSettingsScreen',
            });
          },
        })}
      />

      <Drawer.Screen
        name="AccountSettingsScreenStack"
        component={AccountSettingsScreenStack}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

    </Drawer.Navigator>
  );
};

export default DrawerNavigatorRoutes;