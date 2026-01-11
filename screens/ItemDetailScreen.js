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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../config/theme';
import ConfirmModal from '../components/ConfirmModal';

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.placeholderText}>Item not found</Text>
        <TouchableOpacity style={{marginTop:16}} onPress={() => navigation.goBack()}>
          <Text style={{color:'#007AFF'}}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = currentUser && currentUser.id === item.user_id;

  return (
    <ScrollView style={styles.container}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{item?.title || 'Untitled'}</Text>
        <Text style={styles.price}>
          {item?.price ? `$${parseFloat(item.price).toFixed(2)}` : 'Free'}
        </Text>

        {item?.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}

        {item?.category && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.category}>{item.category}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <Text style={styles.sellerName}>
            {seller?.full_name || seller?.email || 'Unknown'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={[styles.status, item?.status === 'available' && styles.statusAvailable]}>
            {item?.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
          </Text>
        </View>

        {!isOwner && (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => navigation.navigate('Chat', {
              otherUserId: item.user_id,
              otherUserName: seller?.full_name || 'Seller',
            })}
          >
            <Text style={styles.messageButtonText}>Message Seller</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Item</Text>
          </TouchableOpacity>
        )}
      </View>
      <ConfirmModal
        visible={confirmVisible}
        title={confirmPayload?.type === 'delete' ? 'Delete Item' : ''}
        message={confirmPayload?.type === 'delete' ? 'Are you sure you want to delete this item?' : ''}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmProceed}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 18,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  category: {
    fontSize: 16,
    color: '#333',
  },
  sellerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  status: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  statusAvailable: {
    color: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 12,
    ...SHADOWS.small,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
