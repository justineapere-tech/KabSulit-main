import React, { useState, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, LAYOUT } from "../config/theme";
import ConfirmModal from "../components/ConfirmModal";
import Avatar from "../components/Avatar";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import EmptyState from "../components/EmptyState";

export default function ProfileScreen({ navigation, route }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemCount, setItemCount] = useState(0);
  const [userItems, setUserItems] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const previousUserIdRef = useRef(null);

  // State to track if we should show own profile
  const [forceOwnProfile, setForceOwnProfile] = useState(false);

  // Edit Profile Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingCampusId, setEditingCampusId] = useState("");
  const [editingBio, setEditingBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Logout Confirmation Modal States
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  // Load profile on mount or when route params change
  useEffect(() => {
    // Initial load - will be handled by useFocusEffect
    loadUserProfile(null);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // When Profile tab comes into focus
      const viewingUserId = route?.params?.userId;
      
      // Only reset to own profile if we're returning from another tab without userId param
      if (!viewingUserId && previousUserIdRef.current) {
        // We had a userId before but now we don't - load own profile
        loadUserProfile(null);
      } else if (viewingUserId && viewingUserId !== previousUserIdRef.current) {
        // New userId param - load that user
        loadUserProfile(viewingUserId);
      } else if (!viewingUserId && !previousUserIdRef.current) {
        // First time or returning without any userId - load own profile
        loadUserProfile(null);
      }
      
      previousUserIdRef.current = viewingUserId;
    }, [route?.params?.userId])
  );

  const loadUserProfile = async (viewingUserId) => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // If viewingUserId is provided, show that user; otherwise show current user
      const userIdToLoad = viewingUserId || currentUser?.id;
      const isOwnProfile = !viewingUserId || viewingUserId === currentUser?.id;
      
      setIsOwnProfile(isOwnProfile);
      setUser(isOwnProfile ? currentUser : null);

      console.log("Loading profile - Own?", isOwnProfile, "User ID:", userIdToLoad);

      // Load the profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdToLoad)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setProfile(profileData);

      // Load items
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userIdToLoad)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      setUserItems(items || []);
      setItemCount(items?.length || 0);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <EmptyState
          icon={<Text style={styles.emptyIcon}>👤</Text>}
          title="Profile Not Found"
          description="This profile doesn't exist or has been removed"
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const renderItemCard = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
      activeOpacity={0.9}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.itemPlaceholder]}>
          <Text style={styles.itemPlaceholderIcon}>📦</Text>
        </View>
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>
          {item.price ? `₱${parseFloat(item.price).toLocaleString()}` : 'Free'}
        </Text>
        {item.category && (
          <View style={styles.itemCategoryBadge}>
            <Text style={styles.itemCategoryText}>{item.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleEditProfile = () => {
    if (profile) {
      setEditingName(profile.full_name || "");
      setEditingCampusId(profile.campus_id || "");
      setEditingBio(profile.bio || "");
      setEditModalVisible(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editingName,
          campus_id: editingCampusId,
          bio: editingBio,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: editingName,
        campus_id: editingCampusId,
        bio: editingBio,
      });

      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    setLogoutConfirmVisible(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutConfirmVisible(false);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error("Logout error:", err);
      Alert.alert("Error", err.message || "Failed to logout");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {!isOwnProfile && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  previousUserIdRef.current = null;
                  navigation.setParams({ userId: undefined });
                  loadUserProfile(null);
                }}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileSection}>
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar
                name={profile?.full_name}
                size="xl"
                style={styles.profileAvatar}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile?.full_name || "Student User"}
                </Text>
                {profile?.campus_id && (
                  <View style={styles.campusIdBadge}>
                    <Text style={styles.campusIdText}>ID: {profile.campus_id}</Text>
                  </View>
                )}
                {profile?.bio && (
                  <Text style={styles.profileBio}>{profile.bio}</Text>
                )}
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{itemCount}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxBorder]}>
                <Text style={styles.statIcon}>⭐</Text>
                <Text style={styles.statLabel}>New Seller</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>100%</Text>
                <Text style={styles.statLabel}>Responsive</Text>
              </View>
            </View>

            {/* Own Profile Actions */}
            {isOwnProfile && (
              <View style={styles.profileActions}>
                <Button
                  title="Edit Profile"
                  onPress={handleEditProfile}
                  variant="outline"
                  size="medium"
                  style={styles.editButton}
                />
                <Button
                  title="Logout"
                  onPress={handleLogout}
                  variant="text"
                  size="medium"
                />
              </View>
            )}
          </Card>

          {/* Quick Actions (Only for own profile) */}
          {isOwnProfile && (
            <View style={styles.quickActions}>
              <Card
                style={styles.actionCard}
                onPress={() => navigation.navigate("PostItem")}
              >
                <View style={styles.actionCardContent}>
                  <View style={styles.actionIconCircle}>
                    <Text style={styles.actionIcon}>➕</Text>
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Post New Item</Text>
                    <Text style={styles.actionDescription}>List something for sale</Text>
                  </View>
                </View>
              </Card>

              <Card
                style={styles.actionCard}
                onPress={() => navigation.navigate("MyItems")}
              >
                <View style={styles.actionCardContent}>
                  <View style={styles.actionIconCircle}>
                    <Text style={styles.actionIcon}>📦</Text>
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>My Listings</Text>
                    <Text style={styles.actionDescription}>Manage your items</Text>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Items Section */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>
              {isOwnProfile ? "Your Listings" : "Items Listed"}
            </Text>

            {userItems.length > 0 ? (
              <FlatList
                data={userItems}
                renderItem={renderItemCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.itemsRow}
              />
            ) : (
              <EmptyState
                icon={<Text style={styles.emptyIcon}>📦</Text>}
                title="No items listed"
                description={
                  isOwnProfile
                    ? "Start selling by posting your first item"
                    : "This user hasn't listed any items yet"
                }
                actionLabel={isOwnProfile ? "Post Item" : null}
                onAction={isOwnProfile ? () => navigation.navigate("PostItem") : null}
                style={styles.emptyListings}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Full Name"
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="Enter your full name"
                  leftIcon={<Text style={styles.inputIcon}>👤</Text>}
                />

                <Input
                  label="Campus ID"
                  value={editingCampusId}
                  onChangeText={setEditingCampusId}
                  placeholder="Enter your campus ID"
                  leftIcon={<Text style={styles.inputIcon}>🎓</Text>}
                />

                <Input
                  label="Bio"
                  value={editingBio}
                  onChangeText={setEditingBio}
                  placeholder="Tell others about yourself..."
                  multiline
                  numberOfLines={4}
                  maxLength={200}
                  showCharacterCount
                  leftIcon={<Text style={styles.inputIcon}>📝</Text>}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setEditModalVisible(false)}
                  variant="outline"
                  size="large"
                  style={styles.modalButton}
                />
                <Button
                  title="Save"
                  onPress={handleSaveProfile}
                  loading={savingProfile}
                  variant="primary"
                  size="large"
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Confirmation */}
      <ConfirmModal
        visible={logoutConfirmVisible}
        title="Logout"
        message="Are you sure you want to logout?"
        onCancel={() => setLogoutConfirmVisible(false)}
        onConfirm={handleConfirmLogout}
        cancelLabel="Cancel"
        confirmLabel="Logout"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.secondary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.secondary,
    padding: SPACING.xl,
  },

  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary.main,
    paddingTop: Platform.OS === 'ios' ? SPACING.huge : SPACING.xl,
    paddingBottom: SPACING.xxl,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },

  headerSpacer: {
    width: 40,
  },

  // Profile Section
  profileSection: {
    marginTop: -SPACING.xxxl,
    paddingHorizontal: SPACING.base,
  },

  profileCard: {
    padding: SPACING.xl,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  profileAvatar: {
    marginBottom: SPACING.base,
    borderWidth: 4,
    borderColor: COLORS.white,
    ...SHADOWS.md,
  },

  profileInfo: {
    alignItems: 'center',
  },

  profileName: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  profileBio: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
    paddingHorizontal: SPACING.base,
  },

  campusIdBadge: {
    backgroundColor: COLORS.primary.container,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },

  campusIdText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
  },

  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border.light,
  },

  statNumber: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  statIcon: {
    fontSize: 24,
    marginBottom: SPACING.xxs,
  },

  statLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },

  // Profile Actions
  profileActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },

  editButton: {
    flex: 1,
  },

  // Quick Actions
  quickActions: {
    marginTop: SPACING.base,
    gap: SPACING.sm,
  },

  actionCard: {
    marginBottom: 0,
  },

  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.base,
  },

  actionIcon: {
    fontSize: 24,
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },

  actionDescription: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },

  // Items Section
  itemsSection: {
    marginTop: SPACING.xl,
  },

  sectionTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.base,
  },

  itemsRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },

  itemCard: {
    width: '48%',
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },

  itemImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.surface.tertiary,
  },

  itemPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemPlaceholderIcon: {
    fontSize: 48,
  },

  itemDetails: {
    padding: SPACING.sm,
  },

  itemTitle: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    minHeight: 36,
  },

  itemPrice: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING.xs,
  },

  itemCategoryBadge: {
    backgroundColor: COLORS.surface.tertiary,
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xxs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },

  itemCategoryText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.secondary,
    fontSize: 10,
  },

  // Empty State
  emptyIcon: {
    fontSize: 64,
  },

  emptyListings: {
    marginTop: SPACING.xl,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: COLORS.surface.primary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },

  modalTitle: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.text.primary,
  },

  modalCloseIcon: {
    fontSize: 24,
    color: COLORS.text.tertiary,
  },

  modalBody: {
    padding: SPACING.xl,
  },

  inputIcon: {
    fontSize: 20,
  },

  modalActions: {
    flexDirection: 'row',
    padding: SPACING.xl,
    paddingTop: SPACING.base,
    gap: SPACING.sm,
  },

  modalButton: {
    flex: 1,
  },
});
