import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, LAYOUT } from "../config/theme";
import Button from "../components/Button";
import Input from "../components/Input";
import Chip from "../components/Chip";

const CATEGORIES = [
  "Books",
  "Notes",
  "Electronics",
  "Furniture",
  "Clothing",
  "Other",
];

export default function PostItemScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Books");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to upload images"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("item-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Information", "Please enter a title for your item");
      return;
    }

    if (!category) {
      Alert.alert("Missing Information", "Please select a category");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error } = await supabase.from("items").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : null,
        category,
        image_url: imageUrl,
        status: "available",
      });

      if (error) throw error;

      // Clear form fields
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("Books");
      setImage(null);
      
      // Show success modal
      setSuccessModalVisible(true);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to post item");
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>List an Item</Text>
          <Text style={styles.headerSubtitle}>
            Share what you're selling with the campus community
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* Image Upload Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📷 Item Photo</Text>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.uploadedImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={pickImage}
                >
                  <Text style={styles.changeImageText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadPlaceholder}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.uploadIcon}>
                  <Text style={styles.uploadIconText}>📸</Text>
                </View>
                <Text style={styles.uploadText}>Tap to upload photo</Text>
                <Text style={styles.uploadHint}>Add a clear photo of your item</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="What are you selling?"
              maxLength={100}
              showCharacterCount
            />
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                  size="medium"
                  style={styles.categoryChip}
                />
              ))}
            </View>
          </View>

          {/* Price Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Price</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₱</Text>
                <Input
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  style={styles.priceInput}
                  inputStyle={styles.priceInputText}
                />
              </View>
              <Button
                title="Free"
                onPress={() => setPrice("")}
                variant={!price ? "primary" : "outline"}
                size="small"
                style={styles.freeButton}
              />
            </View>
            <Text style={styles.priceHint}>
              Leave blank or tap "Free" for free items
            </Text>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Input
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the condition, features, or any important details..."
              multiline
              numberOfLines={4}
              maxLength={500}
              showCharacterCount
            />
          </View>

          {/* Submit Button */}
          <Button
            title={uploading ? "Posting..." : "Post Item"}
            onPress={handlePost}
            loading={uploading}
            variant="primary"
            size="large"
            fullWidth
            style={styles.submitButton}
          />

          {/* Tips Section */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Tips for a Great Listing</Text>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Use clear, well-lit photos</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Describe the condition honestly</Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Price competitively</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Posted Successfully!</Text>
            <Text style={styles.successMessage}>
              Your item is now live on the marketplace
            </Text>
            <Button
              title="View Feed"
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.goBack();
              }}
              variant="primary"
              size="large"
              fullWidth
              style={styles.successButton}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.secondary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary.main,
    paddingTop: Platform.OS === 'ios' ? SPACING.huge : SPACING.xl,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  headerTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },

  headerSubtitle: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.secondary.lighter,
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.surface.primary,
    marginTop: -SPACING.lg,
    marginHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },

  section: {
    marginBottom: SPACING.xl,
  },

  sectionLabel: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },

  // Image Upload
  uploadPlaceholder: {
    borderWidth: 2,
    borderColor: COLORS.primary.light,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
    backgroundColor: COLORS.primary.container,
  },

  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: COLORS.surface.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
  },

  uploadIconText: {
    fontSize: 40,
  },

  uploadText: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.primary.main,
    marginBottom: SPACING.xs,
  },

  uploadHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
  },

  imageContainer: {
    position: 'relative',
  },

  uploadedImage: {
    width: '100%',
    height: 240,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface.tertiary,
  },

  removeImageButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.circle,
    backgroundColor: COLORS.semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },

  removeImageText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  changeImageButton: {
    marginTop: SPACING.base,
    backgroundColor: COLORS.surface.tertiary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'center',
  },

  changeImageText: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.primary.main,
  },

  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  categoryChip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    borderWidth: 1,
    borderColor: COLORS.border.main,
    borderRadius: BORDER_RADIUS.md,
    paddingLeft: SPACING.base,
    marginRight: SPACING.sm,
  },

  currencySymbol: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginRight: SPACING.xs,
  },

  priceInput: {
    flex: 1,
    marginBottom: 0,
  },

  priceInputText: {
    ...TYPOGRAPHY.styles.h4,
  },

  freeButton: {
    paddingHorizontal: SPACING.lg,
  },

  priceHint: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },

  // Submit Button
  submitButton: {
    marginTop: SPACING.base,
    marginBottom: SPACING.xl,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: COLORS.secondary.container,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.base,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary.main,
  },

  tipsTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },

  tipRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },

  tipBullet: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.secondary.main,
    marginRight: SPACING.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  tipText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
    flex: 1,
  },

  // Success Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.lg,
  },

  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  successIcon: {
    fontSize: 48,
    color: COLORS.white,
    fontWeight: '700',
  },

  successTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  successMessage: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },

  successButton: {
    marginTop: SPACING.base,
  },
});
