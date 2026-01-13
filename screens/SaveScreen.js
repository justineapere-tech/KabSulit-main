import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "../config/theme";
import ConfirmModal from "../components/ConfirmModal";

export default function SaveScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState("all"); // "all", "favorites", or collection ID
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);

  // Modal states
  const [createCollectionModalVisible, setCreateCollectionModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadAllData();
      }
    }, [user])
  );

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load collections
      await loadCollections();
      
      // Load saved items for "All Items"
      await loadSavedItems();
      
      // Load favorite items
      await loadFavoriteItems();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from("user_collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;
      setCollections(data || []);
    } catch (error) {
      console.error("Error loading collections:", error);
    }
  };

  const loadSavedItems = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("saved_items")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      const savedItemIds = profileData?.saved_items || [];

      if (savedItemIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("items")
          .select("*")
          .in("id", savedItemIds)
          .eq("status", "available")
          .order("created_at", { ascending: false });

        if (itemsError) throw itemsError;
        setSavedItems(items || []);
      } else {
        setSavedItems([]);
      }
    } catch (error) {
      console.error("Error loading saved items:", error);
    }
  };

  const loadFavoriteItems = async () => {
    try {
      const { data: favorites, error: favError } = await supabase
        .from("profiles")
        .select("favorite_item_ids")
        .eq("id", user.id)
        .single();

      if (favError && favError.code !== "PGRST116") {
        throw favError;
      }

      const favoriteIds = favorites?.favorite_item_ids || [];

      if (favoriteIds.length > 0) {
        const { data: favItems, error: favItemsError } = await supabase
          .from("items")
          .select("*")
          .in("id", favoriteIds)
          .eq("status", "available")
          .order("created_at", { ascending: false });

        if (favItemsError) throw favItemsError;
        setFavoriteItems(favItems || []);
      } else {
        setFavoriteItems([]);
      }
    } catch (error) {
      console.error("Error loading favorite items:", error);
    }
  };

  const loadCollectionItems = async (collectionId) => {
    try {
      const { data, error } = await supabase
        .from("collection_items")
        .select("item_id, items(*)")
        .eq("collection_id", collectionId);

      if (error) throw error;

      const items = data?.map((ci) => ci.items).filter((item) => item?.status === "available") || [];
      setCollectionItems(items);
    } catch (error) {
      console.error("Error loading collection items:", error);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert("Error", "Collection name cannot be empty");
      return;
    }

    try {
      setCreatingCollection(true);
      const { data, error } = await supabase
        .from("user_collections")
        .insert([
          {
            user_id: user.id,
            name: newCollectionName.trim(),
            is_default: false,
          },
        ])
        .select();

      if (error) throw error;

      setCollections([...collections, data[0]]);
      setNewCollectionName("");
      setCreateCollectionModalVisible(false);
      Alert.alert("Success", "Collection created!");
    } catch (error) {
      console.error("Error creating collection:", error);
      Alert.alert("Error", error.message || "Failed to create collection");
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      // Delete all items in collection first
      const { error: itemsError } = await supabase
        .from("collection_items")
        .delete()
        .eq("collection_id", collectionToDelete.id);

      if (itemsError) throw itemsError;

      // Delete collection
      const { error } = await supabase
        .from("user_collections")
        .delete()
        .eq("id", collectionToDelete.id);

      if (error) throw error;

      setCollections(collections.filter((c) => c.id !== collectionToDelete.id));
      setDeleteConfirmVisible(false);
      setCollectionToDelete(null);
      setSelectedCollection("all");
      Alert.alert("Success", "Collection deleted!");
    } catch (error) {
      console.error("Error deleting collection:", error);
      Alert.alert("Error", error.message || "Failed to delete collection");
    }
  };

  const handleRemoveItemFromCollection = async (itemId) => {
    try {
      if (selectedCollection === "all") {
        // Remove from saved items
        const newSavedIds = savedItems
          .filter((item) => item.id !== itemId)
          .map((item) => item.id);

        const { error } = await supabase
          .from("profiles")
          .update({ saved_items: newSavedIds })
          .eq("id", user.id);

        if (error) throw error;
        setSavedItems(savedItems.filter((item) => item.id !== itemId));
      } else if (selectedCollection === "favorites") {
        // Remove from favorites
        const newFavIds = favoriteItems
          .filter((item) => item.id !== itemId)
          .map((item) => item.id);

        const { error } = await supabase
          .from("profiles")
          .update({ favorite_item_ids: newFavIds })
          .eq("id", user.id);

        if (error) throw error;
        setFavoriteItems(favoriteItems.filter((item) => item.id !== itemId));
      } else {
        // Remove from custom collection
        const { error } = await supabase
          .from("collection_items")
          .delete()
          .eq("collection_id", selectedCollection)
          .eq("item_id", itemId);

        if (error) throw error;
        loadCollectionItems(selectedCollection);
      }

      Alert.alert("Removed", "Item removed from collection");
    } catch (error) {
      console.error("Error removing item:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  const renderItemCard = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
    >
      <View style={styles.itemImageContainer}>
        {item.image_url ? (
          <Image source={{ uri: String(item.image_url) }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Ionicons name="camera-outline" size={32} color={COLORS.text.tertiary} />
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItemFromCollection(item.id)}
      >
        <Ionicons name="close" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.itemPrice}>
          {item.price ? `₱${parseFloat(item.price).toFixed(2)}` : "Free"}
        </Text>
        {item.category && (
          <View style={styles.itemCategory}>
            <Text style={styles.itemCategoryText}>{item.category}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getDisplayItems = () => {
    if (selectedCollection === "all") {
      return savedItems;
    } else if (selectedCollection === "favorites") {
      return favoriteItems;
    } else {
      return collectionItems;
    }
  };

  const getEmptyMessage = () => {
    if (selectedCollection === "all") {
      return "No saved items yet. Start saving posts!";
    } else if (selectedCollection === "favorites") {
      return "No favorite items yet. Mark items as favorites!";
    } else {
      return "No items in this collection yet.";
    }
  };

  const handleSelectCollection = (collectionId) => {
    setSelectedCollection(collectionId);
    if (collectionId !== "all" && collectionId !== "favorites") {
      loadCollectionItems(collectionId);
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noUserText}>Please login to view saved items</Text>
      </View>
    );
  }

  const displayItems = getDisplayItems();
  const emptyMessage = getEmptyMessage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
        <Text style={styles.headerSubtitle}>Saved items and favorites</Text>
      </View>

      {/* Collections List (Horizontal Scroll) */}
      <View style={styles.collectionsHeader}>
        <Text style={styles.collectionsLabel}>My Collections</Text>
        <TouchableOpacity
          style={styles.addCollectionButton}
          onPress={() => setCreateCollectionModalVisible(true)}
        >
          <Text style={styles.addCollectionButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.collectionsScroll}
        contentContainerStyle={styles.collectionsContent}
      >
        {/* All Items - Default */}
        <TouchableOpacity
          style={[
            styles.collectionButton,
            selectedCollection === "all" && styles.collectionButtonActive,
          ]}
          onPress={() => handleSelectCollection("all")}
        >
          <Ionicons name="cube-outline" size={20} color={selectedCollection === "all" ? COLORS.primary.main : COLORS.text.secondary} />
          <Text
            style={[
              styles.collectionButtonText,
              selectedCollection === "all" && styles.collectionButtonTextActive,
            ]}
          >
            All Items
          </Text>
        </TouchableOpacity>

        {/* My Favorites - Default */}
        <TouchableOpacity
          style={[
            styles.collectionButton,
            selectedCollection === "favorites" && styles.collectionButtonActive,
          ]}
          onPress={() => handleSelectCollection("favorites")}
        >
          <Ionicons name="star" size={20} color={selectedCollection === "favorites" ? COLORS.semantic.warning : COLORS.text.secondary} />
          <Text
            style={[
              styles.collectionButtonText,
              selectedCollection === "favorites" &&
                styles.collectionButtonTextActive,
            ]}
          >
            My Favorites
          </Text>
        </TouchableOpacity>

        {/* Custom Collections */}
        {collections.map((collection) => (
          <TouchableOpacity
            key={collection.id}
            style={[
              styles.collectionButton,
              selectedCollection === collection.id && styles.collectionButtonActive,
            ]}
            onPress={() => handleSelectCollection(collection.id)}
            onLongPress={() => {
              setCollectionToDelete(collection);
              setDeleteConfirmVisible(true);
            }}
          >
            <Ionicons name="folder-outline" size={20} color={selectedCollection === collection.id ? COLORS.text.primary : COLORS.text.secondary} style={{ marginRight: SPACING.sm }} />
            <Text
              style={[
                styles.collectionButtonText,
                selectedCollection === collection.id &&
                  styles.collectionButtonTextActive,
              ]}
              numberOfLines={1}
            >
              {collection.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      ) : displayItems.length > 0 ? (
        <FlatList
          data={displayItems}
          renderItem={renderItemCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.itemsGridRow}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color={COLORS.text.tertiary} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("Feed")}
          >
            <Text style={styles.browseButtonText}>Browse Items</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Collection Modal */}
      <Modal visible={createCollectionModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Collection</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Collection name (e.g., 'Winter Finds')"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholderTextColor={COLORS.text.secondary}
                maxLength={30}
              />
              <Text style={styles.charCounter}>
                {newCollectionName.length}/30
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setCreateCollectionModalVisible(false);
                    setNewCollectionName("");
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCreateButton]}
                  onPress={handleCreateCollection}
                  disabled={creatingCollection}
                >
                  {creatingCollection ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalCreateButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Collection Confirmation */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Collection"
        message={`Are you sure you want to delete "${collectionToDelete?.name}"? This action cannot be undone.`}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setCollectionToDelete(null);
        }}
        onConfirm={handleDeleteCollection}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warm.cream,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? SPACING.huge : SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  collectionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  collectionsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addCollectionButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  addCollectionButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 12,
  },
  collectionsScroll: {
    flexGrow: 0,
  },
  collectionsContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  collectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  collectionButtonActive: {
    backgroundColor: COLORS.secondary.main,
    borderColor: COLORS.secondary.main,
  },
  collectionButtonIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  collectionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.secondary,
    maxWidth: 100,
  },
  collectionButtonTextActive: {
    color: COLORS.text.primary,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  itemsGridRow: {
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  itemCard: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.sm,
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
    backgroundColor: COLORS.warm.cream,
  },
  placeholderText: {
    fontSize: 20,
  },
  removeButton: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.semantic.error,
    borderRadius: BORDER_RADIUS.full,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.sm,
  },
  removeButtonText: {
    fontSize: 16,
    color: COLORS.semantic.error,
    fontWeight: "700",
  },
  itemInfo: {
    padding: SPACING.md,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary.main,
    marginBottom: SPACING.xs,
  },
  itemCategory: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: "flex-start",
  },
  itemCategoryText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  browseButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  noUserText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: "85%",
    ...SHADOWS.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  charCounter: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: "right",
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: COLORS.warm.cream,
  },
  modalCancelButtonText: {
    color: COLORS.text.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  modalCreateButton: {
    backgroundColor: COLORS.primary.main,
  },
  modalCreateButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
