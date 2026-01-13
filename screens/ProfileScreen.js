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
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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
  
  // Track the currently loaded profile ID to prevent re-renders
  const currentlyLoadedUserIdRef = useRef(undefined);

  // Edit Profile Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingCampusId, setEditingCampusId] = useState("");
  const [editingBio, setEditingBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Logout Confirmation Modal States
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadUserProfile(null);
  }, []);

  // When screen comes into focus, check if we need to reload
  useFocusEffect(
    React.useCallback(() => {
      const requestedUserId = route?.params?.userId;
      
      // Only reload if the requested userId is different from what we currently have loaded
      if (requestedUserId !== currentlyLoadedUserIdRef.current) {
        // Clear data immediately to prevent showing stale data
        setProfile(null);
        setUserItems([]);
        setItemCount(0);
        
        // Then load the new user
        loadUserProfile(requestedUserId || null);
        currentlyLoadedUserIdRef.current = requestedUserId;
      }
    }, [route?.params?.userId])
  );

  const loadUserProfile = async (viewingUserId) => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) return;
      
      // Determine which user to load
      const userIdToLoad = viewingUserId || currentUser.id;
      const isOwnProfile = !viewingUserId || viewingUserId === currentUser.id;
      
      console.log("Loading profile - Requested:", viewingUserId, "Own?", isOwnProfile, "User ID:", userIdToLoad);

      // Load the profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdToLoad)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Verify we're still loading the same user (in case params changed during async operation)
      if (userIdToLoad !== (currentlyLoadedUserIdRef.current || currentUser.id)) {
        console.log("User ID changed during load, discarding old data");
        return;
      }
      
      setIsOwnProfile(isOwnProfile);
      setUser(isOwnProfile ? currentUser : null);
      setProfile(profileData);

      // Load items
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userIdToLoad)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      // Verify again before setting state
      if (userIdToLoad !== (currentlyLoadedUserIdRef.current || currentUser.id)) {
        console.log("User ID changed during items load, discarding old data");
        return;
      }

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
          icon={<Ionicons name="person-circle-outline" size={64} color={COLORS.text.tertiary} />}
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
          <Ionicons name="cube-outline" size={32} color={COLORS.text.tertiary} />
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
      const updateData = {
        full_name: editingName,
        bio: editingBio,
      };
      
      // Only include campus_id if it's not empty
      if (editingCampusId.trim()) {
        updateData.campus_id = editingCampusId;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: editingName,
        bio: editingBio,
        ...(editingCampusId.trim() && { campus_id: editingCampusId }),
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
            {route?.name === 'UserProfile' && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  navigation.goBack();
                }}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
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
                <Ionicons name="star" size={20} color={COLORS.semantic.warning} />
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
                    <Ionicons name="add-circle" size={22} color={COLORS.primary.main} />
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
                    <Ionicons name="cube-outline" size={22} color={COLORS.primary.main} />
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
                icon={<Ionicons name="cube-outline" size={64} color={COLORS.text.tertiary} />}
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
                  <Ionicons name="close" size={24} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Input
                  label="Full Name"
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="Enter your full name"
                  leftIcon={<Ionicons name="person" size={20} color={COLORS.text.tertiary} />}
                />

                <Input
                  label="Campus ID"
                  value={editingCampusId}
                  onChangeText={setEditingCampusId}
                  placeholder="Enter your campus ID"
                  leftIcon={<Ionicons name="school" size={20} color={COLORS.text.tertiary} />}
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
                  leftIcon={<Ionicons name="create-outline" size={20} color={COLORS.text.tertiary} />}
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
    backgroundColor: COLORS.warm.cream,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warm.cream,
    padding: SPACING.xl,
  },

  loadingText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: SPACING.xxl * 3,
  },

  // Header - Clean minimal
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.xl,
    paddingBottom: SPACING.base,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
  },

  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsIcon: {
    fontSize: 24,
    color: COLORS.text.secondary,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 24,
    color: COLORS.text.primary,
  },

  headerSpacer: {
    width: 40,
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: SPACING.base,
  },

  profileCard: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.white,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  profileAvatar: {
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.surface.tertiary,
  },

  profileInfo: {
    alignItems: 'center',
  },

  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  profileBio: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  profileMeta: {
    marginTop: SPACING.sm,
  },

  metaText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  campusIdBadge: {
    backgroundColor: COLORS.primary.container,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },

  campusIdText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '600',
  },

  // Stats Row - Clean centered style
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },

  statBox: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  statBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border.light,
  },

  statNumber: {
    fontSize: 20,
    color: COLORS.text.primary,
    fontWeight: '700',
  },

  statIcon: {
    fontSize: 20,
    marginBottom: SPACING.xxs,
  },

  statLabel: {
    fontSize: 12,
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
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
  },

  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.secondary.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.base,
  },

  actionIcon: {
    fontSize: 22,
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
  },

  actionDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // Items Section
  itemsSection: {
    marginTop: SPACING.xl,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.base,
  },

  itemsRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },

  // Item Card - Horizontal list style
  itemCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    ...SHADOWS.sm,
  },

  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surface.tertiary,
  },

  itemPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemPlaceholderIcon: {
    fontSize: 32,
  },

  itemDetails: {
    flex: 1,
    padding: SPACING.sm,
    justifyContent: 'center',
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  itemPrice: {
    fontSize: 16,
    color: COLORS.primary.main,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },

  itemCategoryBadge: {
    backgroundColor: COLORS.primary.light,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },

  itemCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },

  itemMenuButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    padding: SPACING.xs,
  },

  itemMenuIcon: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },

  // Empty State
  emptyIcon: {
    fontSize: 56,
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
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
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
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: 18,
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
