import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, LAYOUT } from '../config/theme';

/**
 * Modern Button Component
 * Variants: primary, secondary, outline, text, danger
 * Sizes: small, medium, large
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? COLORS.white : COLORS.primary.main}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: LAYOUT.buttonHeight,
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  icon: {
    marginRight: SPACING.sm,
  },
  
  // Variants
  primary: {
    backgroundColor: COLORS.primary.main,
    ...SHADOWS.button,
  },
  
  secondary: {
    backgroundColor: COLORS.black,
    ...SHADOWS.button,
  },
  
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary.main,
  },
  
  text: {
    backgroundColor: 'transparent',
  },
  
  danger: {
    backgroundColor: COLORS.semantic.error,
    ...SHADOWS.button,
  },
  
  // Sizes
  small: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    minHeight: 36,
    borderRadius: BORDER_RADIUS.full,
  },
  
  medium: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  
  large: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    minHeight: 52,
    borderRadius: BORDER_RADIUS.full,
  },
  
  // Text styles
  primaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  
  secondaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  
  outlineText: {
    color: COLORS.primary.main,
    fontSize: 15,
    fontWeight: '600',
  },
  
  textText: {
    color: COLORS.primary.main,
    fontSize: 15,
    fontWeight: '600',
  },
  
  dangerText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  
  smallText: {
    fontSize: 13,
  },
  
  mediumText: {
    fontSize: 15,
  },
  
  largeText: {
    fontSize: 16,
  },
  
  // States
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: 0.4,
  },
  
  disabledText: {
    opacity: 0.6,
  },
});
