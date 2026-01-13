import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../config/theme';

/**
 * Modern Card Component
 * Variants: default, elevated, outlined
 */
export default function Card({
  children,
  variant = 'default',
  onPress,
  style,
  contentStyle,
}) {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container
      style={[styles.card, styles[variant], style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  
  content: {
    padding: SPACING.base,
  },
  
  // Variants
  default: {
    ...SHADOWS.sm,
  },
  
  elevated: {
    ...SHADOWS.md,
  },
  
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    ...SHADOWS.none,
  },
});
