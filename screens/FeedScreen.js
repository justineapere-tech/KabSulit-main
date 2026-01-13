import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ConfirmModal from '../components/ConfirmModal';
import SaveToCollectionsModal from '../components/SaveToCollectionsModal';
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, LAYOUT } from "../config/theme";
import Card from '../components/Card';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';

const CATEGORIES = ["All", "Books", "Notes", "Electronics", "Furniture", "Clothing", "Other"];

const { width: screenWidth } = Dimensions.get('window');
const logoWidth = Math.min(screenWidth * 0.85, 350);
const logoHeight = logoWidth * 0.5;

export default function FeedScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentUser, setCurrentUser] = useState(null);
  const [likes, setLikes] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    getCurrentUser();
    loadItems();
    const subscription = supabase
      .channel("items_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, selectedCategory]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      await loadUserReactions(user.id);
    }
  };

  const loadUserReactions = async (userId) => {
    try {
      const { data: reactionsData, error } = await supabase
        .from('reactions')
        .select('item_id')
        .eq('user_id', userId);
      if (error) throw error;
      const map = {};
      (reactionsData || []).forEach(r => {
        map[r.item_id] = true;
      });
      setLikes(map);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (selectedCategory !== "All") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  };

  const loadItems = async (isLoadMore = false) => {
    try {
      const offset = isLoadMore ? pageOffset : 0;
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (itemsError) throw itemsError;

      if (!itemsData || itemsData.length === 0) {
        if (!isLoadMore) setItems([]);
        setHasMore(false);
        return;
      }

      const userIds = [...new Set(itemsData.map(item => item.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError);
      }

      const itemsWithProfiles = itemsData.map(item => ({
        ...item,
        profiles: profilesData?.find(profile => profile.id === item.user_id) || null,
      }));

      if (isLoadMore) {
        // Append new items
        setItems(prev => [...prev, ...itemsWithProfiles]);
        setPageOffset(offset + pageSize);
      } else {
        // Replace items (initial load or refresh)
        setItems(itemsWithProfiles);
        setPageOffset(pageSize);
      }

      // If we got fewer items than pageSize, there are no more items
      if (itemsData.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      if (!isLoadMore) setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPageOffset(0);
    setHasMore(true);
    loadItems(false);
  };

  const handleEndReached = () => {
    if (!isLoadingMore && hasMore && !refreshing && !loading) {
      setIsLoadingMore(true);
      loadItems(true);
    }
  };

  const handleDeletePost = (itemId, userId) => {
    console.log('Delete button pressed for item:', itemId);
    // Show in-app confirmation modal instead of browser confirm/Alert
    setConfirmPayload({ type: 'delete', itemId, userId });
    setConfirmVisible(true);
  };

  const handleLike = async (itemId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Login required', 'Please login to react to items');
        return;
      }

      const currentlyLiked = !!likes[itemId];

      if (currentlyLiked) {
        // remove reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .match({ item_id: itemId, user_id: user.id });
        if (error) throw error;
        setLikes(prev => ({ ...prev, [itemId]: false }));
      } else {
        // insert reaction
        const { error } = await supabase
          .from('reactions')
          .insert({ item_id: itemId, user_id: user.id });
        if (error) throw error;
        setLikes(prev => ({ ...prev, [itemId]: true }));
      }
    } catch (error) {
      console.error('Reaction error:', error);
      Alert.alert('Error', error.message || 'Failed to update reaction');
    }
  };

  const handleSavePress = (itemId) => {
    if (!currentUser) {
      Alert.alert('Login required', 'Please login to save items');
      return;
    }
    setSelectedItemId(itemId);
    setSaveModalVisible(true);
  };

  const handleConfirmCancel = () => {
    setConfirmVisible(false);
    setConfirmPayload(null);
  };

  const handleConfirmProceed = async () => {
    if (!confirmPayload) return;
    if (confirmPayload.type === 'delete') {
      const { itemId, userId } = confirmPayload;
      setConfirmVisible(false);
      setDeletingId(itemId);
      try {
        let user = null;
        try {
          const resp = await supabase.auth.getUser();
          user = resp?.data?.user || null;
        } catch (e) {
          console.warn('getUser failed, will try getSession', e);
        }

        if (!user) {
          try {
            const sess = await supabase.auth.getSession();
            user = sess?.data?.session?.user || null;
          } catch (e) {
            console.warn('getSession failed', e);
          }
        }

        if (!user) {
          Alert.alert('Error', 'You must be logged in to delete items');
          return;
        }

        if (user.id !== userId) {
          Alert.alert('Error', 'Not authorized to delete this item');
          return;
        }

        console.log('Deleting item', itemId, 'as user', user.id);
        const { error } = await supabase
          .from('items')
          .delete()
          .match({ id: itemId, user_id: user.id });

        if (error) throw error;

        await loadItems();
        Alert.alert('Success', 'Post deleted successfully');
      } catch (err) {
        console.error('Delete failed:', err);
        Alert.alert('Error', err.message || 'Failed to delete post');
      } finally {
        setDeletingId(null);
        setConfirmPayload(null);
      }
    }
  };

  const renderItemCard = ({ item }) => (
    <Card style={styles.itemCard}>
      {/* Card Header - User Info */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.userSection}
          onPress={() => navigation.navigate("UserProfile", { userId: item.user_id })}
        >
          <Avatar
            name={item.profiles?.full_name}
            size="sm"
            style={styles.userAvatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.profiles?.full_name || "Anonymous"}
            </Text>
            <Text style={styles.postDate}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        {currentUser?.id === item.user_id && (
          <TouchableOpacity
            disabled={deletingId === item.id}
            onPress={() => handleDeletePost(item.id, item.user_id)}
            style={styles.menuButton}
          >
            <MaterialIcons name="more-vert" size={24} color={COLORS.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Card Image */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, item })}
        activeOpacity={0.9}
      >
        {item.image_url ? (
          <Image
            source={{ uri: String(item.image_url) }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cube-outline" size={56} color={COLORS.text.tertiary} />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Category Badge on Image */}
        {item.category && (
          <View style={styles.categoryOverlay}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, item })}
          activeOpacity={0.9}
        >
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>
            {item.price ? `₱${parseFloat(item.price).toLocaleString()}` : "Free"}
          </Text>
          {item.description ? (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleLike(item.id)}
            >
              <Ionicons 
                name={likes[item.id] ? "heart" : "heart-outline"} 
                size={22} 
                color={likes[item.id] ? "#FF4B4B" : COLORS.text.secondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Comments", { itemId: item.id })}
            >
              <Ionicons name="chatbubble-outline" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleSavePress(item.id)}
            >
              <Ionicons name="bookmark-outline" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {currentUser?.id !== item.user_id && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => navigation.navigate("Chat", {
                otherUserId: item.user_id,
                otherUserName: item.profiles?.full_name || "Seller"
              })}
            >
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>Loading marketplace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Clean minimal with title */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <View style={{ marginRight: SPACING.sm }}>
            <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categorySection}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item: category }) => (
            <Chip
              label={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              size="medium"
            />
          )}
        />
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItemCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
            progressBackgroundColor={COLORS.white}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          refreshing ? (
            <View style={styles.refreshHeader}>
              <View style={styles.refreshCircle}>
                <ActivityIndicator size="large" color={COLORS.primary.main} />
              </View>
              <Text style={styles.refreshText}>Refreshing...</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={COLORS.primary.main} />
              <Text style={styles.loadMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="mail-open-outline" size={64} color={COLORS.text.tertiary} />}
            title={
              searchQuery || selectedCategory !== "All"
                ? "No items found"
                : "No items yet"
            }
            description={
              searchQuery || selectedCategory !== "All"
                ? "Try adjusting your search or category filter"
                : "Be the first to list an item on the marketplace!"
            }
          />
        }
      />

      {/* Modals */}
      <ConfirmModal
        visible={confirmVisible}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmProceed}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
      <SaveToCollectionsModal
        visible={saveModalVisible}
        itemId={selectedItemId}
        userId={currentUser?.id}
        onClose={() => setSaveModalVisible(false)}
        onSaveSuccess={() => {
          Alert.alert('Saved!', 'Item saved to your collection');
        }}
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
  },

  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },

  // Header - Clean minimal style
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.base,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLogo: {
    width: 120,
    height: 40,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.xxs,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.warm.cream,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.base,
    height: 48,
    ...SHADOWS.sm,
  },

  searchIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
    color: COLORS.text.tertiary,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    padding: 0,
  },

  clearIcon: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    paddingLeft: SPACING.sm,
  },

  // Category Section
  categorySection: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.warm.cream,
  },

  categoryList: {
    paddingHorizontal: SPACING.base,
  },

  // List
  listContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },

  // Item Card - Modern social media style
  itemCard: {
    marginBottom: SPACING.base,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },

  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userAvatar: {
    marginRight: SPACING.sm,
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },

  postDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },

  menuButton: {
    padding: SPACING.xs,
  },

  menuIcon: {
    fontSize: 20,
    color: COLORS.text.secondary,
  },

  // Image
  itemImage: {
    width: '100%',
    height: 260,
    backgroundColor: COLORS.surface.tertiary,
  },

  placeholderImage: {
    width: '100%',
    height: 260,
    backgroundColor: COLORS.surface.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderIcon: {
    fontSize: 56,
    marginBottom: SPACING.sm,
  },

  placeholderText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },

  // Category Overlay - Positioned on image
  categoryOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },

  categoryTag: {
    backgroundColor: 'rgba(27, 94, 32, 0.9)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },

  categoryTagText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card Content
  cardContent: {
    padding: SPACING.base,
  },

  // Price & Stock Badges Row
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  priceBadge: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },

  priceBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  stockBadge: {
    backgroundColor: COLORS.primary.light,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },

  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },

  itemPrice: {
    fontSize: 20,
    color: COLORS.primary.main,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },

  itemDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  // Card Actions - Social media style
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },

  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
    paddingVertical: SPACING.xs,
  },

  actionIcon: {
    fontSize: 20,
  },

  actionCount: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
  },

  messageButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },

  messageButtonText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },

  // Refresh Header
  refreshHeader: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warm.cream,
  },

  refreshCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },

  refreshText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // Load More
  loadMoreContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadMoreText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },

  // Empty State
  emptyIcon: {
    fontSize: 64,
  },
});
