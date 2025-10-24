// src/components/FormInput.js
import React, { useState, forwardRef } from "react";
import { TextInput, StyleSheet } from "react-native";
import { lightColors as c } from "../../theme"; // auth screens = always light

const FormInput = forwardRef(
  ({ value, onChangeText, placeholder, secureTextEntry, error, style, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? c.error
      : focused
      ? c.accent           // active/focus
      : c.border;          // default

    return (
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { color: c.text, borderColor, backgroundColor: c.card },
          style,
        ]}
        {...rest}
      />
    );
  }
);

export default FormInput;

const styles = StyleSheet.create({
  input: {
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 24,
  },
});
