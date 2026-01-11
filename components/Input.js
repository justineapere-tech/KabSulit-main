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
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    borderWidth: 1,
    borderColor: COLORS.border.main,
    borderRadius: BORDER_RADIUS.md,
    minHeight: LAYOUT.inputHeight,
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
  },
  
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
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
    paddingHorizontal: SPACING.xs,
  },
  
  errorText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.semantic.error,
  },
  
  helperText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text.secondary,
  },
  
  characterCount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.sm,
  },
});
