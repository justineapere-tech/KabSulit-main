import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../config/supabase';
import { isValidCampusEmail, validateEmail, validatePassword } from '../utils/validation';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../config/theme';
import Button from '../components/Button';
import Input from '../components/Input';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError('');
  };

  const validateForm = () => {
    let isValid = true;

    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name');
      return false;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else if (!isValidCampusEmail(email)) {
      setEmailError('Only @cvsu.edu.ph email addresses are allowed');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      Alert.alert(
        'Account Created! 🎉',
        'Please check your email to verify your account before signing in.',
        [
          {
            text: 'Got it',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section with Logo */}
        <View style={styles.heroSection}>
          <View style={styles.brandContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Form Section - Yellow Card */}
        <View style={styles.formSection}>
          <View style={styles.formCard}>
            {/* Header */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>Get Started</Text>
              <Text style={styles.welcomeSubtitle}>
                Enter your details below
              </Text>
            </View>

            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  autoCapitalize="words"
                  style={styles.inputField}
                  inputContainerStyle={styles.inputContainer}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.inputField}
                  inputContainerStyle={styles.inputContainer}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  style={styles.inputField}
                  inputContainerStyle={styles.inputContainer}
                  rightIcon={
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                  }
                />
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, confirmPasswordError && styles.inputWrapperError]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm Password"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.inputField}
                  inputContainerStyle={styles.inputContainer}
                  rightIcon={
                    <TouchableOpacity 
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={COLORS.text.tertiary} />
                    </TouchableOpacity>
                  }
                />
              </View>
              {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warm.cream,
  },

  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroSection: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  
  brandContainer: {
    alignItems: 'center',
  },
  
  logo: {
    width: 280,
    height: 150,
  },

  // Form Section
  formSection: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  
  formCard: {
    backgroundColor: COLORS.secondary.main,
    borderRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    ...SHADOWS.lg,
  },
  
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: SPACING.xs,
  },
  
  welcomeSubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },

  // Input Styles
  inputGroup: {
    marginBottom: SPACING.md,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingLeft: SPACING.base,
    ...SHADOWS.sm,
  },
  
  inputWrapperError: {
    borderWidth: 1,
    borderColor: COLORS.semantic.error,
  },
  
  inputIconContainer: {
    width: 30,
    alignItems: 'center',
  },
  
  inputIconEmoji: {
    fontSize: 18,
  },
  
  inputField: {
    flex: 1,
    marginBottom: 0,
  },
  
  inputContainer: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.sm,
    minHeight: 50,
  },
  
  eyeButton: {
    padding: SPACING.sm,
  },
  
  eyeIcon: {
    fontSize: 18,
  },
  
  errorText: {
    color: COLORS.semantic.error,
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.base,
  },

  // Sign Up Button
  signUpButton: {
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.md,
  },
  
  signUpButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.text.tertiary,
  },
  
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 13,
    color: COLORS.text.secondary,
  },

  // Google Button
  googleButton: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  
  googleIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Sign In Link
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  
  signInText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  
  signInLink: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
});
