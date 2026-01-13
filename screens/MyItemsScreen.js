import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../config/theme';
import ConfirmModal from '../components/ConfirmModal';
import Button from '../components/Button';
import Chip from '../components/Chip';

export default function MyItemsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  useEffect(() => {
    loadMyItems();
  }, []);

  // Hide the navigator header; we render our own header with back button
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadMyItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyItems();
  };

  const handleDeleteItem = (itemId) => {
    console.log('Delete button pressed for my item:', itemId);
    setConfirmPayload({ type: 'delete', itemId, userId: null });
    setConfirmVisible(true);
  };

  const handleConfirmCancel = () => {
    setConfirmVisible(false);
    setConfirmPayload(null);
  };

  const handleConfirmProceed = async () => {
    if (!confirmPayload) return;
    if (confirmPayload.type === 'delete') {
      const { itemId } = confirmPayload;
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

        console.log('Deleting my item', itemId, 'as user', user.id);
        const { error } = await supabase
          .from('items')
          .delete()
          .match({ id: itemId, user_id: user.id });

        if (error) throw error;

        await loadMyItems();
        Alert.alert('Success', 'Item deleted successfully');
      } catch (err) {
        console.error('Delete failed:', err);
        Alert.alert('Error', err.message || 'Failed to delete item');
      } finally {
        setDeletingId(null);
        setConfirmPayload(null);
      }
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCardWrapper}>
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ItemDetail', { item })}
      >
        {item.image_url ? (
          <Image source={{ uri: String(item.image_url) }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage]}>
            <Ionicons name="camera-outline" size={32} color={COLORS.text.tertiary} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemPrice}>
            ₱{item.price ? parseFloat(item.price).toFixed(2) : 'Free'}
          </Text>
          <Text
            style={[
              styles.itemStatus,
              item.status === 'available' && styles.statusAvailable,
              item.status === 'sold' && styles.statusSold,
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id)}
        disabled={deletingId === item.id}
      >
        <Ionicons name="close" size={16} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Items</Text>
        </View>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>You haven't posted any items yet</Text>
            <TouchableOpacity
              style={styles.postButton}
              onPress={() => navigation.navigate('PostItem')}
            >
              <Text style={styles.postButtonText}>Post Your First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <ConfirmModal
        visible={confirmVisible}
        title={confirmPayload?.type === 'delete' ? 'Delete Item' : ''}
        message={confirmPayload?.type === 'delete' ? 'Are you sure you want to delete this item?' : ''}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmProceed}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warm.cream,
  },
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  itemCardWrapper: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.warm.cream,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warm.cream,
  },
  placeholderText: {
    fontSize: 24,
  },
  itemInfo: {
    padding: SPACING.md,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary.main,
    marginBottom: SPACING.xs,
  },
  itemStatus: {
    fontSize: 11,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  statusAvailable: {
    color: COLORS.semantic.success,
  },
  statusSold: {
    color: COLORS.semantic.error,
  },
  deleteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.semantic.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  deleteIcon: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  postButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  postButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
