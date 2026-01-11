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
} from "react-native";
import ConfirmModal from '../components/ConfirmModal';
import SaveToCollectionsModal from '../components/SaveToCollectionsModal';
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, LAYOUT } from "../config/theme";
import Card from '../components/Card';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';

const CATEGORIES = ["All", "Books", "Notes", "Electronics", "Furniture", "Clothing", "Other"];

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

  const loadItems = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      if (!itemsData || itemsData.length === 0) {
        setItems([]);
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

      setItems(itemsWithProfiles);
    } catch (error) {
      console.error("Error loading items:", error);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
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
          onPress={() => navigation.navigate("Profile", { userId: item.user_id })}
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
            <Text style={styles.menuIcon}>⋯</Text>
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
            source={{ uri: item.image_url }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderIcon}>📦</Text>
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
              <Text style={styles.actionIcon}>{likes[item.id] ? "❤️" : "🤍"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Comments", { itemId: item.id })}
            >
              <Text style={styles.actionIcon}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleSavePress(item.id)}
            >
              <Text style={styles.actionIcon}>🔖</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>KabSulit</Text>
          <Text style={styles.headerSubtitle}>Campus Marketplace</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items or sellers..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>📭</Text>}
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
    backgroundColor: COLORS.surface.secondary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.secondary,
  },

  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary.main,
    paddingTop: Platform.OS === 'ios' ? SPACING.huge : SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.base,
  },

  headerContent: {
    alignItems: 'center',
  },

  headerTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.white,
  },

  headerSubtitle: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.secondary.lighter,
    marginTop: SPACING.xxs,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
    backgroundColor: COLORS.surface.secondary,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.base,
    height: LAYOUT.inputHeight,
    ...SHADOWS.sm,
  },

  searchIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },

  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text.primary,
    padding: 0,
  },

  clearIcon: {
    fontSize: 18,
    color: COLORS.text.tertiary,
    paddingLeft: SPACING.sm,
  },

  // Category Section
  categorySection: {
    paddingTop: SPACING.base,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface.secondary,
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

  // Item Card
  itemCard: {
    marginBottom: SPACING.base,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
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
    ...TYPOGRAPHY.styles.label,
    color: COLORS.text.primary,
  },

  postDate: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xxs,
  },

  menuButton: {
    padding: SPACING.xs,
  },

  menuIcon: {
    fontSize: 24,
    color: COLORS.text.secondary,
  },

  // Image
  itemImage: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.surface.tertiary,
  },

  placeholderImage: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.surface.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderIcon: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },

  placeholderText: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.tertiary,
  },

  // Category Overlay
  categoryOverlay: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },

  categoryTag: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
  },

  categoryTagText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Card Content
  cardContent: {
    padding: SPACING.base,
  },

  itemTitle: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  itemPrice: {
    ...TYPOGRAPHY.styles.h3,
    color: COLORS.primary.main,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING.sm,
  },

  itemDescription: {
    ...TYPOGRAPHY.styles.bodySmall,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
    marginBottom: SPACING.md,
  },

  // Card Actions
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
    marginRight: SPACING.lg,
  },

  actionIcon: {
    fontSize: 22,
  },

  messageButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
  },

  messageButtonText: {
    ...TYPOGRAPHY.styles.label,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weight.semiBold,
  },

  // Empty State
  emptyIcon: {
    fontSize: 72,
  },
});
