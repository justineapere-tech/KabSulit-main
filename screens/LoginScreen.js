import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, LAYOUT } from "../config/theme";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address to reset your password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert("Success", "Password reset link has been sent to your email");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.brandContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>🎓</Text>
            </View>
            <Text style={styles.appTitle}>KabSulit</Text>
            <Text style={styles.appSubtitle}>CvSU Campus Marketplace</Text>
            <View style={styles.universityBadge}>
              <Text style={styles.badgeText}>Cavite State University</Text>
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <View style={styles.formCard}>
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to continue to your account
            </Text>

            {/* Email Input */}
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@cvsu.edu.ph"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
            />

            {/* Password Input */}
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.inputIcon}>{showPassword ? "👁" : "👁‍🗨"}</Text>
                </TouchableOpacity>
              }
            />

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
              size="large"
              fullWidth
              style={styles.loginButton}
            />

            {/* Register Link */}
            <View style={styles.registerPrompt}>
              <Text style={styles.registerText}>New to KabSulit? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo Credentials Info */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoIcon}>ℹ️</Text>
              <Text style={styles.demoTitle}>Demo Account</Text>
            </View>
            <View style={styles.demoContent}>
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Email:</Text>
                <Text style={styles.demoValue}>demo@cvsu.edu.ph</Text>
              </View>
              <View style={styles.demoRow}>
                <Text style={styles.demoLabel}>Password:</Text>
                <Text style={styles.demoValue}>demo1234</Text>
              </View>
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
  
  // Hero Section
  heroSection: {
    backgroundColor: COLORS.primary.main,
    paddingTop: Platform.OS === 'ios' ? SPACING.huge + SPACING.xl : SPACING.huge,
    paddingBottom: SPACING.xxxl,
    borderBottomLeftRadius: BORDER_RADIUS.xxl,
    borderBottomRightRadius: BORDER_RADIUS.xxl,
  },
  
  brandContainer: {
    alignItems: 'center',
  },
  
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    ...SHADOWS.lg,
  },
  
  logoIcon: {
    fontSize: 56,
  },
  
  appTitle: {
    ...TYPOGRAPHY.styles.hero,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  
  appSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.secondary.light,
    marginBottom: SPACING.lg,
  },
  
  universityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  badgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weight.semiBold,
    letterSpacing: 0.5,
  },
  
  // Form Section
  formSection: {
    flex: 1,
    marginTop: -SPACING.xl,
    paddingHorizontal: SPACING.base,
  },
  
  formCard: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  
  welcomeTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  
  welcomeSubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  
  inputIcon: {
    fontSize: 20,
  },
  
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  
  forgotPasswordText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },
  
  loginButton: {
    marginBottom: SPACING.base,
  },
  
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.base,
  },
  
  registerText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
  },
  
  registerLink: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  
  // Demo Card
  demoCard: {
    backgroundColor: COLORS.secondary.container,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary.main,
  },
  
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  demoIcon: {
    fontSize: 18,
    marginRight: SPACING.xs,
  },
  
  demoTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  
  demoContent: {
    marginLeft: SPACING.xl,
  },
  
  demoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xxs,
  },
  
  demoLabel: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
    width: 80,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  
  demoValue: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },
});
