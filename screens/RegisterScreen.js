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
} from 'react-native';
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Join KabSulit</Text>
            <Text style={styles.subtitle}>
              Connect with your campus community 🎓
            </Text>
          </View>

          <View style={styles.formCard}>
            {/* Full Name */}
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Juan Dela Cruz"
              autoCapitalize="words"
              leftIcon={<Text style={styles.inputIcon}>👤</Text>}
            />

            {/* Email */}
            <Input
              label="Campus Email"
              value={email}
              onChangeText={handleEmailChange}
              placeholder="juan.delacruz@cvsu.edu.ph"
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              helperText="Only @cvsu.edu.ph emails are accepted"
              leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
            />

            {/* Password */}
            <Input
              label="Password"
              value={password}
              onChangeText={handlePasswordChange}
              placeholder="At least 6 characters"
              secureTextEntry={!showPassword}
              error={passwordError}
              leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.inputIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
                </TouchableOpacity>
              }
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirmPassword}
              error={confirmPasswordError}
              leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={styles.inputIcon}>{showConfirmPassword ? '👁' : '👁‍🗨'}</Text>
                </TouchableOpacity>
              }
            />

            {/* Terms Notice */}
            <View style={styles.termsNotice}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>

            {/* Register Button */}
            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              variant="primary"
              size="large"
              fullWidth
              style={styles.registerButton}
            />

            {/* Login Link */}
            <View style={styles.loginPrompt}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: COLORS.surface.secondary,
  },

  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? SPACING.huge : SPACING.xl,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    backgroundColor: COLORS.surface.primary,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 24,
    color: COLORS.text.primary,
  },

  headerTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  // Form Section
  formSection: {
    flex: 1,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xl,
  },

  titleContainer: {
    marginBottom: SPACING.xl,
  },

  title: {
    ...TYPOGRAPHY.styles.h1,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  subtitle: {
    ...TYPOGRAPHY.styles.bodyLarge,
    color: COLORS.text.secondary,
  },

  formCard: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },

  inputIcon: {
    fontSize: 20,
  },

  termsNotice: {
    backgroundColor: COLORS.surface.tertiary,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },

  termsText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },

  registerButton: {
    marginBottom: SPACING.base,
  },

  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  loginText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },

  loginLink: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
});
