import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from '../config/theme';

export default function SaveToCollectionsModal({
  visible,
  itemId,
  onClose,
  userId,
  onSaveSuccess,
}) {
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [allItems, setAllItems] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      loadCollectionsAndStatus();
    }
  }, [visible, userId, itemId]);

  const loadCollectionsAndStatus = async () => {
    try {
      setLoading(true);

      // Load user collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('user_collections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', false)
        .order('created_at', { ascending: false });

      if (collectionsError && collectionsError.code !== 'PGRST116')
        throw collectionsError;

      setCollections(collectionsData || []);

      // Check if item is in "All Items" (saved_items)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('saved_items, favorite_item_ids')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const savedItemIds = profileData?.saved_items || [];
      const favoriteIds = profileData?.favorite_item_ids || [];

      setAllItems(savedItemIds.includes(itemId));
      setFavorites(favoriteIds.includes(itemId));

      // Load which custom collections have this item
      const { data: collectionItemsData, error: ciError } = await supabase
        .from('collection_items')
        .select('collection_id')
        .eq('item_id', itemId);

      if (ciError && ciError.code !== 'PGRST116') throw ciError;

      const selectedIds = collectionItemsData?.map((ci) => ci.collection_id) || [];
      setSelectedCollections(selectedIds);
    } catch (error) {
      console.error('Error loading collections:', error);
      Alert.alert('Error', 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCollection = (collectionId) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleToggleAllItems = () => {
    setAllItems(!allItems);
  };

  const handleToggleFavorites = () => {
    setFavorites(!favorites);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update "All Items"
      const { data: profileData } = await supabase
        .from('profiles')
        .select('saved_items, favorite_item_ids')
        .eq('id', userId)
        .single();

      let savedItems = profileData?.saved_items || [];
      let favoriteIds = profileData?.favorite_item_ids || [];

      if (allItems && !savedItems.includes(itemId)) {
        savedItems = [...savedItems, itemId];
      } else if (!allItems && savedItems.includes(itemId)) {
        savedItems = savedItems.filter((id) => id !== itemId);
      }

      if (favorites && !favoriteIds.includes(itemId)) {
        favoriteIds = [...favoriteIds, itemId];
      } else if (!favorites && favoriteIds.includes(itemId)) {
        favoriteIds = favoriteIds.filter((id) => id !== itemId);
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ saved_items: savedItems, favorite_item_ids: favoriteIds })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Get currently saved collections for this item
      const { data: currentCollectionItems } = await supabase
        .from('collection_items')
        .select('collection_id')
        .eq('item_id', itemId);

      const currentCollectionIds = currentCollectionItems?.map((ci) => ci.collection_id) || [];

      // Remove from collections that are no longer selected
      const toRemove = currentCollectionIds.filter(
        (id) => !selectedCollections.includes(id)
      );
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('collection_items')
          .delete()
          .in('collection_id', toRemove)
          .eq('item_id', itemId);

        if (removeError) throw removeError;
      }

      // Add to newly selected collections
      const toAdd = selectedCollections.filter(
        (id) => !currentCollectionIds.includes(id)
      );
      if (toAdd.length > 0) {
        const insertData = toAdd.map((collectionId) => ({
          collection_id: collectionId,
          item_id: itemId,
        }));

        const { error: addError } = await supabase
          .from('collection_items')
          .insert(insertData);

        if (addError) throw addError;
      }

      Alert.alert('Success', 'Item saved to collections!');
      onClose();
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', error.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Save to Collections</Text>
              <View style={{ width: 30 }} />
            </View>

            {/* Collections List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView style={styles.body}>
                {/* All Items */}
                <TouchableOpacity
                  style={styles.collectionItem}
                  onPress={handleToggleAllItems}
                >
                  <View style={styles.checkbox}>
                    {allItems && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>📦 All Items</Text>
                    <Text style={styles.collectionDesc}>Default collection</Text>
                  </View>
                </TouchableOpacity>

                {/* My Favorites */}
                <TouchableOpacity
                  style={styles.collectionItem}
                  onPress={handleToggleFavorites}
                >
                  <View style={styles.checkbox}>
                    {favorites && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>⭐ My Favorites</Text>
                    <Text style={styles.collectionDesc}>Default collection</Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Collections */}
                {collections.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Custom Collections</Text>
                    {collections.map((collection) => (
                      <TouchableOpacity
                        key={collection.id}
                        style={styles.collectionItem}
                        onPress={() => handleToggleCollection(collection.id)}
                      >
                        <View style={styles.checkbox}>
                          {selectedCollections.includes(collection.id) && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </View>
                        <View style={styles.collectionInfo}>
                          <Text style={styles.collectionName}>
                            📁 {collection.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {collections.length === 0 && (
                  <View style={styles.emptyCollections}>
                    <Text style={styles.emptyText}>
                      No custom collections yet. Create one in your Saved tab!
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.primary.onPrimary} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Item</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    paddingBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    fontSize: SIZES.xl,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  collectionDesc: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  emptyCollections: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray100,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: SIZES.md,
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
  },
  saveButtonText: {
    color: COLORS.primary.onPrimary,
    fontWeight: '700',
    fontSize: SIZES.md,
  },
});
