import React from 'react';
import { StyleSheet, View, Modal, ActivityIndicator } from 'react-native';
import { lightColors, darkColors } from '../../theme';
import updateDarkMode from './DarkMode';

const Loader = ({ loading, containerStyle, boxStyle, spinnerProps }) => {
  const { darkMode } = updateDarkMode();
  const boxBg = darkMode ? darkColors.textSecondary : lightColors.text;
  const spinnerColor = darkMode ? darkColors.surface : lightColors.headerBg;

  return (
    <Modal transparent animationType="none" visible={loading}>
      <View
        style={[
          styles.modalBackground,
          containerStyle,
        ]}
      >
        <View
          style={[
            styles.activityIndicatorWrapper,
            { backgroundColor: boxBg },
            boxStyle,
          ]}
        >
          <ActivityIndicator
            animating
            size="large"
            color={spinnerColor}
            style={styles.activityIndicator}
            {...spinnerProps}
          />
        </View>
      </View>
    </Modal>
  );
};

export default Loader;

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIndicatorWrapper: {
    height: 100,
    width: 100,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIndicator: { height: 80 },
});
