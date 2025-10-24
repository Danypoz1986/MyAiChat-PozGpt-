import React from 'react';
import {View, Image, TouchableOpacity} from 'react-native';
import { darkColors, lightColors } from '../../theme';
import updateDarkMode from '../Components/DarkMode'

const NavigationDrawerHeader = (props) => {
  const { darkMode } = updateDarkMode();
  
  const toggleDrawer = () => {
    props.navigationProps.toggleDrawer();
  };

  return (
    <View style={{flexDirection: 'row'}}>
      <TouchableOpacity onPress={toggleDrawer}>
        <Image
          source={{
            uri:
              'https://raw.githubusercontent.com/AboutReact/sampleresource/master/drawerWhite.png',
          }}
          style={{width: 25, height: 25, marginLeft: 5, tintColor: !darkMode ? lightColors.text : darkColors.text}}
        />
      </TouchableOpacity>
    </View>
  );
};
export default NavigationDrawerHeader;