import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../config/theme';

/**
 * Chip Component
 * Used for categories, tags, filters
 */
export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  variant = 'default',
  size = 'medium',
  style,
}) {
  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container
      style={[
        styles.chip,
        styles[variant],
        selected && styles.selected,
        selected && styles[`${variant}Selected`],
        styles[size],
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.label,
          styles[`${variant}Label`],
          selected && styles.selectedLabel,
          selected && styles[`${variant}SelectedLabel`],
          styles[`${size}Label`],
        ]}
      >
        {label}
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  
  icon: {
    marginRight: SPACING.xs,
  },
  
  // Variants
  default: {
    backgroundColor: COLORS.white,
    borderWidth: 0,
  },
  
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border.main,
  },
  
  // Selected states
  selected: {},
  
  defaultSelected: {
    backgroundColor: COLORS.primary.main,
  },
  
  outlineSelected: {
    backgroundColor: COLORS.primary.container,
    borderColor: COLORS.primary.main,
  },
  
  // Sizes
  small: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  
  medium: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },
  
  large: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  
  // Label styles
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  defaultLabel: {
    color: COLORS.text.secondary,
  },
  
  outlineLabel: {
    color: COLORS.text.secondary,
  },
  
  selectedLabel: {},
  
  defaultSelectedLabel: {
    color: COLORS.white,
  },
  
  outlineSelectedLabel: {
    color: COLORS.primary.main,
  },
  
  smallLabel: {
    fontSize: 11,
  },
  
  mediumLabel: {
    fontSize: 13,
  },
  
  largeLabel: {
    fontSize: 15,
  },
});
