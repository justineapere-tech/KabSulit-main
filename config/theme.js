/**
 * KabSulit - Modern Design System
 * Based on CvSU (Cavite State University) Brand Colors
 * Design Philosophy: Clean, Modern, Warm & Accessible
 * References: Material Design 3, iOS HIG
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLORS = {
  // Primary - CvSU Green (Main brand color)
  primary: {
    main: '#1B5E20',      // Deep forest green
    light: '#4CAF50',     // Vibrant green
    lighter: '#81C784',   // Soft green
    dark: '#0D3B14',      // Darkest green
    container: '#E8F5E9', // Light green background
    onPrimary: '#FFFFFF', // Text on primary
  },
  
  // Secondary - CvSU Gold/Yellow (Accent brand color)
  secondary: {
    main: '#F9A825',      // Rich gold
    light: '#FBC02D',     // Bright yellow
    lighter: '#FFF59D',   // Pale yellow
    dark: '#F57F17',      // Dark gold
    container: '#FFFDE7', // Light yellow background
    onSecondary: '#000000', // Text on secondary
  },
  
  // Warm Background Colors (Cream/Beige palette)
  warm: {
    cream: '#FFF8E7',     // Warm cream background
    beige: '#F5E6D3',     // Soft beige
    sand: '#EDE0CC',      // Sand color
    honey: '#FFE4B5',     // Honey tone
    butter: '#FFFBF0',    // Butter cream (very light)
  },
  
  // Surface Colors (backgrounds, cards)
  surface: {
    primary: '#FFFFFF',
    secondary: '#FFF8E7',  // Warm cream background
    tertiary: '#F5E6D3',   // Soft beige
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    card: '#FFFFFF',       // Card background
    input: '#FFFFFF',      // Input field background
  },
  
  // Text Colors
  text: {
    primary: '#1A1A1A',
    secondary: '#5C5C5C',
    tertiary: '#8E8E8E',
    disabled: '#C0C0C0',
    inverse: '#FFFFFF',
    accent: '#1B5E20',     // Green accent text
    gold: '#B8860B',       // Gold accent text
  },
  
  // Semantic Colors
  semantic: {
    success: '#2E7D32',
    successLight: '#66BB6A',
    error: '#C62828',
    errorLight: '#EF5350',
    warning: '#F57C00',
    warningLight: '#FF9800',
    info: '#1976D2',
    infoLight: '#42A5F5',
  },
  
  // Border & Divider
  border: {
    light: '#F0E6D6',      // Warm light border
    main: '#E5D9C8',       // Warm main border
    dark: '#D4C4A8',       // Warm dark border
    focus: '#4CAF50',
    input: '#E0D5C5',      // Input border
  },
  
  // Interactive States
  state: {
    hover: 'rgba(0, 0, 0, 0.04)',
    pressed: 'rgba(0, 0, 0, 0.08)',
    focus: 'rgba(76, 175, 80, 0.12)',
    disabled: 'rgba(0, 0, 0, 0.38)',
  },
  
  // Badge/Chip Colors
  badge: {
    price: '#1B5E20',      // Green price badge
    priceText: '#FFFFFF',
    stock: '#4CAF50',      // Stock indicator
    stockText: '#FFFFFF',
    category: '#F5E6D3',   // Category chip
    categoryText: '#5C5C5C',
  },
  
  // Message Bubbles
  message: {
    sent: '#DCF8C6',       // Sent message bubble (light green)
    received: '#FFFFFF',   // Received message bubble
    sentText: '#1A1A1A',
    receivedText: '#1A1A1A',
  },
  
  // Legacy support (will be deprecated)
  white: '#FFFFFF',
  black: '#1A1A1A',
  background: '#FFF8E7',   // Warm cream
};

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const TYPOGRAPHY = {
  // Font Weights
  weight: {
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
  
  // Font Sizes
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 34,
    hero: 40,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  
  // Preset Text Styles
  styles: {
    hero: {
      fontSize: 40,
      fontWeight: '800',
      lineHeight: 48,
      letterSpacing: -0.5,
    },
    h1: {
      fontSize: 34,
      fontWeight: '700',
      lineHeight: 41,
      letterSpacing: -0.4,
    },
    h2: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
      letterSpacing: -0.2,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 29,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 24,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 22,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 27,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 21,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
  },
};

// Legacy font support
export const FONTS = TYPOGRAPHY.weight;
export const SIZES = TYPOGRAPHY.size;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

// ============================================================================
// BORDER RADIUS SYSTEM
// ============================================================================

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
  circle: 9999,
};

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // Specialized shadows
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const LAYOUT = {
  // Content widths
  contentMaxWidth: 600,
  
  // Touch targets (minimum 44x44 per iOS HIG)
  minTouchTarget: 44,
  
  // Common heights
  headerHeight: 56,
  tabBarHeight: 56,
  inputHeight: 48,
  buttonHeight: 48,
  cardMinHeight: 120,
  
  // Icon sizes
  iconSizes: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  },
  
  // Avatar sizes
  avatarSizes: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
    xxl: 120,
  },
};

// ============================================================================
// ANIMATION CONSTANTS
// ============================================================================

export const ANIMATION = {
  // Duration (milliseconds)
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  // Easing
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================================================
// COMPONENT PRESETS
// ============================================================================

export const COMPONENTS = {
  // Button presets
  button: {
    primary: {
      backgroundColor: COLORS.primary.main,
      color: COLORS.primary.onPrimary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.md,
    },
    secondary: {
      backgroundColor: COLORS.secondary.main,
      color: COLORS.secondary.onSecondary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.md,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: COLORS.primary.main,
      color: COLORS.primary.main,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: BORDER_RADIUS.md,
    },
    text: {
      backgroundColor: 'transparent',
      color: COLORS.primary.main,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.base,
    },
  },
  
  // Input presets
  input: {
    default: {
      backgroundColor: COLORS.surface.primary,
      borderWidth: 1,
      borderColor: COLORS.border.main,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.base,
      fontSize: TYPOGRAPHY.size.md,
      color: COLORS.text.primary,
    },
    focused: {
      borderColor: COLORS.border.focus,
      borderWidth: 2,
    },
    error: {
      borderColor: COLORS.semantic.error,
      borderWidth: 1,
    },
  },
  
  // Card presets
  card: {
    default: {
      backgroundColor: COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.base,
      ...SHADOWS.card,
    },
    elevated: {
      backgroundColor: COLORS.surface.elevated,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.base,
      ...SHADOWS.md,
    },
    outlined: {
      backgroundColor: COLORS.surface.primary,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: COLORS.border.light,
    },
  },
};

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

// Map old SHADOWS.small to new SHADOWS.sm
export const LEGACY_SHADOWS = {
  small: SHADOWS.sm,
  medium: SHADOWS.md,
  large: SHADOWS.lg,
};
