import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, LAYOUT } from '../config/theme';

/**
 * Modern Input Component
 * Features: label, error messages, icons, character count
 */
export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry,
  maxLength,
  showCharacterCount,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  inputContainerStyle,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          multiline && styles.inputContainerMultiline,
          inputContainerStyle,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.tertiary}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {(error || helperText || showCharacterCount) && (
        <View style={styles.footer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!error && helperText && <Text style={styles.helperText}>{helperText}</Text>}
          {showCharacterCount && maxLength && (
            <Text style={styles.characterCount}>
              {value?.length || 0}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.base,
  },
  
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border.input,
    borderRadius: BORDER_RADIUS.full,
    minHeight: 50,
    paddingHorizontal: SPACING.base,
  },
  
  inputContainerFocused: {
    borderColor: COLORS.primary.main,
    borderWidth: 2,
  },
  
  inputContainerError: {
    borderColor: COLORS.semantic.error,
  },
  
  inputContainerMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    paddingVertical: 0,
  },
  
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  inputWithLeftIcon: {
    marginLeft: SPACING.sm,
  },
  
  inputWithRightIcon: {
    marginRight: SPACING.sm,
  },
  
  leftIcon: {
    marginRight: SPACING.xs,
  },
  
  rightIcon: {
    marginLeft: SPACING.xs,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.semantic.error,
  },
  
  helperText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  
  characterCount: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.sm,
  },
});
