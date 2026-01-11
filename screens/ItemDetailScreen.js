import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY, SIZES } from '../config/theme';
import ConfirmModal from '../components/ConfirmModal';
import SaveToCollectionsModal from '../components/SaveToCollectionsModal';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Chip from '../components/Chip';

export default function ItemDetailScreen({ route, navigation }) {
  const params = route.params || {};
  const initialItem = params.item;
  const itemIdFromParams = params.itemId;

  const [item, setItem] = useState(initialItem || null);
  const [seller, setSeller] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // If item not provided, but itemId exists, fetch item
        let fetchedItem = item;
        if (!fetchedItem && itemIdFromParams) {
          const { data: fetchedItemData, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemIdFromParams)
            .single();
          if (itemError) throw itemError;
          fetchedItem = fetchedItemData;
          if (mounted) setItem(fetchedItem);
        }

        // After we have item (either initial or fetched), load seller and current user
        if (mounted) {
          await loadCurrentUser();
          await loadSellerInfo(fetchedItem?.user_id);
        }
      } catch (err) {
        console.error('Error initializing ItemDetailScreen:', err);
        setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // New: load seller by user id
  const loadSellerInfo = async (sellerUserId) => {
    try {
      const userIdToFetch = sellerUserId || item?.user_id;
      if (!userIdToFetch) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdToFetch)
        .single();

      if (error) throw error;
      setSeller(data);
    } catch (error) {
      console.error('Error loading seller:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const handleDelete = () => {
    console.log('Delete button pressed on ItemDetail for item:', item?.id);
    // show modal
    setConfirmPayload({ type: 'delete', itemId: item?.id, userId: item?.user_id });
    setConfirmVisible(true);
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

        if (!user || user.id !== userId) {
          Alert.alert('Error', 'Not authorized to delete this item');
          return;
        }

        console.log('Deleting item', itemId, 'as user', user.id);
        const { error } = await supabase.from('items').delete().match({ id: itemId, user_id: user.id });
        if (error) throw error;
        navigation.goBack();
      } catch (error) {
        console.error('Delete failed on ItemDetail:', error);
        Alert.alert('Error', error.message);
      } finally {
        setConfirmPayload(null);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading item...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>Item Not Found</Text>
        <Text style={styles.emptyDesc}>This item may have been removed or doesn't exist.</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
          style={{ marginTop: SPACING.lg }}
        />
      </View>
    );
  }

  const isOwner = currentUser && currentUser.id === item.user_id;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Status Badge */}
          {item?.status && (
            <View style={[
              styles.statusBadge,
              item.status === 'available' && styles.statusAvailableBadge,
              item.status === 'sold' && styles.statusSoldBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Category Section */}
          <Card variant="elevated" style={styles.priceCard}>
            <View style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.price}>
                  {item?.price ? `₱${parseFloat(item.price).toFixed(2)}` : 'Free'}
                </Text>
              </View>
              {item?.category && (
                <Chip
                  label={item.category}
                  selected={false}
                  variant="default"
                  size="medium"
                />
              )}
            </View>
          </Card>

          {/* Title & Description */}
          <Card variant="elevated" style={styles.infoCard}>
            <Text style={styles.title}>{item?.title || 'Untitled'}</Text>
            
            {item?.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}
          </Card>

          {/* Seller Info */}
          <Card variant="elevated" style={styles.sellerCard}>
            <Text style={styles.sectionLabel}>Seller Information</Text>
            <View style={styles.sellerRow}>
              <Avatar
                imageUri={seller?.avatar_url}
                name={seller?.full_name || seller?.email || 'U'}
                size="lg"
              />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>
                  {seller?.full_name || 'Unknown Seller'}
                </Text>
                <Text style={styles.sellerEmail}>
                  {seller?.email || ''}
                </Text>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          {!isOwner && (
            <View style={styles.actionButtons}>
              <Button
                title="💬 Message Seller"
                onPress={() => navigation.navigate('Chat', {
                  otherUserId: item.user_id,
                  otherUserName: seller?.full_name || 'Seller',
                })}
                variant="primary"
                fullWidth
                style={{ marginBottom: SPACING.sm }}
              />
              <Button
                title="💾 Save to Collection"
                onPress={() => setSaveModalVisible(true)}
                variant="outline"
                fullWidth
              />
            </View>
          )}

          {isOwner && (
            <View style={styles.ownerActions}>
              <Text style={styles.ownerBadge}>👤 You own this item</Text>
              <Button
                title="🗑️ Delete Item"
                onPress={handleDelete}
                variant="danger"
                fullWidth
              />
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmVisible}
        title={confirmPayload?.type === 'delete' ? 'Delete Item' : ''}
        message={confirmPayload?.type === 'delete' ? 'Are you sure you want to delete this item?' : ''}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmProceed}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
      <SaveToCollectionsModal
        visible={saveModalVisible}
        itemId={item?.id}
        userId={currentUser?.id}
        onClose={() => setSaveModalVisible(false)}
        onSaveSuccess={() => {
          // Optional: Show feedback
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  placeholderText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    right: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  statusAvailableBadge: {
    backgroundColor: COLORS.success,
  },
  statusSoldBadge: {
    backgroundColor: COLORS.error,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.white,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.lg,
  },
  priceCard: {
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    ...TYPOGRAPHY.styles.h1,
    color: COLORS.secondary,
    fontWeight: '800',
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.styles.h2,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  descriptionSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  sellerCard: {
    marginBottom: SPACING.md,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  sellerName: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sellerEmail: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    marginTop: SPACING.sm,
  },
  ownerActions: {
    marginTop: SPACING.sm,
  },
  ownerBadge: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    fontWeight: '600',
  },
});
