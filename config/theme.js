// CvSU Cavite State University Color Palette & Theme
// Reference: CvSU Portal branding

export const COLORS = {
  // Primary Colors - CvSU Official Colors
  primary: '#228B22', // Forest Green (CvSU Primary)
  primaryLight: '#32CD32', // Lighter shade of primary
  primaryDark: '#1A6B1A', // Darker shade
  
  // Secondary Colors
  secondary: '#FFD700', // Gold/Yellow (CvSU Secondary)
  secondaryLight: '#FFED4E',
  secondaryDark: '#DAA520',
  
  // Accent Colors
  accent: '#00B4D8', // Cyan/Light Blue for highlights
  accentLight: '#48D1E8',
  accentDark: '#0086A3',
  
  // Functional Colors
  success: '#10B981', // Green
  warning: '#F59E0B', // Amber
  error: '#EF4444', // Red
  danger: '#DC2626', // Dark Red
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background Colors
  background: '#F5F7FA',
  backgroundAlt: '#FFFFFF',
  
  // Text Colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

export const FONTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const SIZES = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
};
