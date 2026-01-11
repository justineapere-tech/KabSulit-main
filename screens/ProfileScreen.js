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
} from "react-native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from "../config/theme";

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noUserText}>Profile not found</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.loginButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItemCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemCard}
      onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
    >
      <View style={styles.itemImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemPrice}>{item.price ? `₱${parseFloat(item.price).toFixed(2)}` : 'Free'}</Text>
        {item.category && (
          <View style={styles.itemCategory}>
            <Text style={styles.itemCategoryText}>{item.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back Button - only show when viewing another user */}
      {!isOwnProfile && (
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // Clear the userId param to show own profile
            previousUserIdRef.current = null;
            navigation.setParams({ userId: undefined });
            loadUserProfile(null);
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      
      {/* Header Background */}
      <View style={styles.headerBackground} />

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : 'U'}
            </Text>
          </View>
        </View>
        <Text style={styles.name}>{profile?.full_name || "Student User"}</Text>
        {user?.email && <Text style={styles.email}>{user.email}</Text>}
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{itemCount}</Text>
          <Text style={styles.statLabel}>Items Listed</Text>
        </View>
        <View style={[styles.statItem, styles.statDivider]}>
          <Text style={styles.statNumber}>⭐</Text>
          <Text style={styles.statLabel}>New Seller</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>100%</Text>
          <Text style={styles.statLabel}>Responsive</Text>
        </View>
      </View>

      {/* Action Buttons - Only for own profile */}
      {isOwnProfile && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("PostItem")}
          >
            <Text style={styles.actionButtonIcon}>➕</Text>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>Post New Item</Text>
              <Text style={styles.actionButtonDesc}>Sell something today</Text>
            </View>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonBorder]}
            onPress={() => navigation.navigate("MyItems")}
          >
            <Text style={styles.actionButtonIcon}>📦</Text>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonTitle}>My Items</Text>
              <Text style={styles.actionButtonDesc}>Manage your listings</Text>
            </View>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Info Section */}
      {profile?.campus_id && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campus Info</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Campus ID</Text>
            <Text style={styles.infoValue}>{profile.campus_id}</Text>
          </View>
        </View>
      )}

      {/* Settings - Only for own profile */}
      {isOwnProfile && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.settingIcon}>⚙️</Text>
            <Text style={styles.settingText}>Settings & Security</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Items Section */}
      {userItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Listed</Text>
          <FlatList
            data={userItems}
            renderItem={renderItemCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.itemsGridRow}
          />
        </View>
      )}

      {userItems.length === 0 && !isOwnProfile && (
        <View style={styles.emptyItemsContainer}>
          <Text style={styles.emptyItemsText}>No items listed yet</Text>
        </View>
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  headerBackground: {
    height: 120,
    backgroundColor: COLORS.primary,
    marginBottom: -60,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.medium,
    zIndex: 10,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "700",
  },
  name: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: SPACING.lg,
    ...SHADOWS.small,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  section: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionButton: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  actionButtonBorder: {
    marginBottom: 0,
  },
  actionButtonIcon: {
    fontSize: SIZES.xl,
    marginRight: SPACING.md,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  actionButtonDesc: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actionButtonArrow: {
    fontSize: SIZES.lg,
    color: COLORS.secondary,
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  infoValue: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  settingItem: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    ...SHADOWS.small,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  settingIcon: {
    fontSize: SIZES.xl,
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  settingArrow: {
    fontSize: SIZES.lg,
    color: COLORS.secondary,
  },
  noUserText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: "600",
  },
  itemsGridRow: {
    justifyContent: "space-between",
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  itemCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  itemImageContainer: {
    width: "100%",
    height: 150,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
  },
  placeholderText: {
    fontSize: SIZES.xl,
  },
  itemInfo: {
    padding: SPACING.md,
  },
  itemTitle: {
    fontSize: SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  itemCategory: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: "flex-start",
  },
  itemCategoryText: {
    fontSize: SIZES.xs,
    color: COLORS.white,
    fontWeight: "600",
  },
  emptyItemsContainer: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptyItemsText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.sm,
    ...SHADOWS.small,
  },
  backButtonText: {
    fontSize: SIZES.lg,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
