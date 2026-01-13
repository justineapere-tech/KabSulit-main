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
  Image,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, LAYOUT } from "../config/theme";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
            {/* Welcome Header */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>
                Enter your details below
              </Text>
            </View>

            {/* Username/Email Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Username"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.inputField}
                  inputContainerStyle={styles.inputContainer}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
                </View>
                <Input
                  value={password}
                  onChangeText={setPassword}
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
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing in..." : "Log In"}
              </Text>
            </TouchableOpacity>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xl,
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
    paddingVertical: SPACING.xxxl,
    ...SHADOWS.lg,
  },
  
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
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
    marginBottom: SPACING.base,
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingLeft: SPACING.base,
    ...SHADOWS.sm,
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
  
  // Login Button
  loginButton: {
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Options Row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.text.secondary,
    borderRadius: 3,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  
  checkboxChecked: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  
  checkmark: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  rememberMeText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  
  forgotPasswordText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  
  // Sign Up
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  
  signUpText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  
  signUpLink: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
});
