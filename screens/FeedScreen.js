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
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import ConfirmModal from '../components/ConfirmModal';
import SaveToCollectionsModal from '../components/SaveToCollectionsModal';
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from "../config/theme";

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

  const renderInstagramPost = ({ item }) => (
    <View style={styles.postContainer}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.profiles?.full_name
                ? item.profiles.full_name.charAt(0).toUpperCase()
                : "U"}
            </Text>
          </View>
          <View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: item.user_id })
              }
            >
              <Text style={styles.userName}>
                {item.profiles?.full_name || item.profiles?.email || "Anonymous"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {currentUser?.id === item.user_id && (
          <TouchableOpacity
            disabled={deletingId === item.id}
            onPress={() => handleDeletePost(item.id, item.user_id)}
          >
            <Text style={styles.deleteIcon}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Image */}
      {item.image_url ? (
        <TouchableOpacity onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, item })}>
          <Image source={{ uri: item.image_url }} style={styles.postImage} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, item })}>
          <View style={[styles.postImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Post Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Text style={styles.actionIcon}>{likes[item.id] ? "❤️" : "🤍"}</Text>
          <Text style={styles.actionLabel}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Comments", { itemId: item.id })}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSavePress(item.id)}
        >
          <Text style={styles.actionIcon}>💾</Text>
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>
        {currentUser?.id !== item.user_id && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Chat", { 
              otherUserId: item.user_id,
              otherUserName: item.profiles?.full_name || "Seller"
            })}
          >
            <Text style={styles.actionIcon}>✉️</Text>
            <Text style={styles.actionLabel}>Message</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Info */}
      <TouchableOpacity style={styles.postInfo} activeOpacity={0.9} onPress={() => navigation.navigate('ItemDetail', { itemId: item.id, item })}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postPrice}>
          ₱{item.price ? parseFloat(item.price).toFixed(2) : "Free"}
        </Text>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
        <Text style={styles.postDescription} numberOfLines={3}>
          {item.description}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategoryItem = (category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.categoryButtonActive,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          selectedCategory === category && styles.categoryButtonTextActive,
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Marketplace</Text>
        <Text style={styles.headerSubtitle}>Buy & Sell with Fellow Students</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items, sellers..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={[styles.categoriesContent, styles.categoriesContentCenter]}
      >
        {CATEGORIES.map(renderCategoryItem)}
      </ScrollView>

      <FlatList
        data={filteredItems}
        renderItem={renderInstagramPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredItems.length > 0 ? styles.listContent : { paddingBottom: 0 }}
        scrollEnabled={filteredItems.length > 0}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== "All"
                ? "No items found"
                : "No items available yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== "All"
                ? "Try adjusting your search or filters"
                : "Be the first to post an item!"}
            </Text>
          </View>
        }
      />
      <ConfirmModal
        visible={confirmVisible}
        title={confirmPayload?.type === 'delete' ? 'Delete Post' : ''}
        message={confirmPayload?.type === 'delete' ? 'Are you sure you want to delete this post?' : ''}
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
          // Optional: Show feedback or reload data
        }}
      />
    </View>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  searchIcon: {
    fontSize: SIZES.lg,
    marginLeft: SPACING.sm,
  },
  categoriesContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 0,
    height: 32,
    marginBottom: 0,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.md,
    paddingRight: SPACING.lg,
    paddingVertical: 0,
    // use margin on items instead of CSS gap for cross-platform support
  },
  categoriesContentCenter: {
    height: 28,
    justifyContent: 'center',
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 56,
    marginRight: SPACING.sm,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  categoryButtonTextActive: {
    color: COLORS.black,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  postContainer: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: "700",
  },
  userName: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  timestamp: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  deleteIcon: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
  },
  postImage: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.gray200,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
  },
  placeholderText: {
    fontSize: SIZES.xxl,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.lg,
  },
  actionIcon: {
    fontSize: SIZES.xl,
    marginRight: SPACING.sm,
  },
  actionLabel: {
    fontSize: SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  postInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  postTitle: {
    fontSize: SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  postPrice: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: "flex-start",
    marginBottom: SPACING.sm,
  },
  categoryBadgeText: {
    fontSize: SIZES.xs,
    fontWeight: "600",
    color: COLORS.white,
  },
  postDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    minHeight: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
