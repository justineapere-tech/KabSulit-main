import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, LAYOUT } from '../config/theme';

/**
 * Avatar Component
 * Supports image, initials fallback, and size variants
 */
export default function Avatar({
  imageUri,
  name,
  size = 'md',
  style,
}) {
  const avatarSize = LAYOUT.avatarSizes[size];
  
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const getFontSize = () => {
    switch (size) {
      case 'xs': return TYPOGRAPHY.size.xs;
      case 'sm': return TYPOGRAPHY.size.sm;
      case 'md': return TYPOGRAPHY.size.md;
      case 'lg': return TYPOGRAPHY.size.xl;
      case 'xl': return TYPOGRAPHY.size.xxxl;
      case 'xxl': return TYPOGRAPHY.size.display;
      default: return TYPOGRAPHY.size.md;
    }
  };

  return (
    <View
      style={[
        styles.avatar,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        style,
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.image,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: getFontSize() }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  
  image: {
    resizeMode: 'cover',
  },
  
  initials: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },
});
