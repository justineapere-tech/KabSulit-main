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
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  
  icon: {
    marginRight: SPACING.xs,
  },
  
  // Variants
  default: {
    backgroundColor: COLORS.surface.tertiary,
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
    paddingVertical: SPACING.xxs,
    paddingHorizontal: SPACING.sm,
  },
  
  medium: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  
  large: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  
  // Label styles
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  
  defaultLabel: {
    color: COLORS.text.primary,
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
    fontSize: TYPOGRAPHY.size.xs,
  },
  
  mediumLabel: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  
  largeLabel: {
    fontSize: TYPOGRAPHY.size.md,
  },
});
