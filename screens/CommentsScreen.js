import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../config/theme';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';

export default function CommentsScreen({ navigation, route }) {
  const itemId = route?.params?.itemId;
  const [item, setItem] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  // Hide the navigator header; we render our own screen header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (itemId) {
      loadCurrentUser();
      loadItem();
      loadComments();
      // Subscribe to new comments
      const subscription = supabase
        .channel(`comments_${itemId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments', filter: `item_id=eq.${itemId}` },
          (payload) => {
            console.log('New comment received:', payload);
            loadComments();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [itemId]);

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadItem = async () => {
    try {
      const { data: itemData, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      setItem(itemData);
    } catch (error) {
      console.error('Error loading item:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for comment authors
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Merge profile data with comments
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.id === comment.user_id) || null,
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'Please login to comment');
      return;
    }

    setCommenting(true);
    try {
      const { error } = await supabase.from('comments').insert([
        {
          item_id: itemId,
          user_id: currentUser.id,
          content: commentText.trim(),
          rating: rating > 0 ? rating : null,
        },
      ]);

      if (error) throw error;

      // Clear form
      setCommentText('');
      setRating(0);

      // Reload comments
      loadComments();
      Alert.alert('Success', 'Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    if (!currentUser) return;
    setCommentToDelete(commentId);
    setDeleteModalVisible(true);
  };

  const performDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      console.log('Deleting comment:', commentToDelete);
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentToDelete)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Delete error:', error);
        Alert.alert('Error', 'Failed to delete comment: ' + error.message);
        return;
      }

      console.log('Comment deleted successfully');
      setComments(prevComments => prevComments.filter(c => c.id !== commentToDelete));
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment');
    } finally {
      setDeleteModalVisible(false);
      setCommentToDelete(null);
    }
  };

  const renderComment = ({ item: comment }) => (
    <Card variant="elevated" style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.avatarAndName}>
          <Avatar
            name={comment.profiles?.full_name || 'Anonymous'}
            size="sm"
          />
          <View style={styles.nameAndRating}>
            <Text style={styles.commentAuthor}>
              {comment.profiles?.full_name || 'Anonymous'}
            </Text>
            {comment.rating && (
              <View style={styles.ratingDisplay}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons 
                    key={star}
                    name={star <= comment.rating ? "star" : "star-outline"}
                    size={16}
                    color={star <= comment.rating ? COLORS.semantic.warning : COLORS.text.tertiary}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
        {currentUser?.id === comment.user_id && (
          <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.semantic.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.commentText}>{comment.content}</Text>
      <Text style={styles.commentTime}>
        {new Date(comment.created_at).toLocaleDateString()}
      </Text>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews & Comments</Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Item Preview */}
      <Card variant="elevated" style={styles.itemPreview}>
        <Text style={styles.itemTitle}>{item?.title}</Text>
        <Text style={styles.itemPrice}>
          ₱{item?.price ? parseFloat(item.price).toFixed(2) : 'Free'}
        </Text>
      </Card>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(comment) => comment.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color={COLORS.text.tertiary} />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
        />
      )}

      {/* Input Section */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.ratingSelector}>
          <Text style={styles.ratingLabel}>Your Rating:</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(rating === star ? 0 : star)}
                style={styles.starButton}
              >
                <Ionicons 
                  name={star <= rating ? "star" : "star-outline"}
                  size={32}
                  color={star <= rating ? COLORS.semantic.warning : COLORS.text.tertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.commentInputWrapper}>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your thoughts..."
            placeholderTextColor={COLORS.text.secondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!commenting}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleAddComment}
            disabled={commenting || !commentText.trim()}
            activeOpacity={0.8}
          >
            {commenting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        onConfirm={performDeleteComment}
        onCancel={() => setDeleteModalVisible(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warm.cream,
  },
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  itemPreview: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    fontSize: 18,
    color: COLORS.secondary.main,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  commentCard: {
    marginBottom: SPACING.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  avatarAndName: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  nameAndRating: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  ratingDisplay: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  ratingIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  deleteIcon: {
    fontSize: 20,
    color: COLORS.semantic.error,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.sm,
  },
  ratingSelector: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  ratingLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stars: {
    flexDirection: 'row',
  },
  starButton: {
    marginRight: SPACING.sm,
  },
  starIcon: {
    fontSize: 28,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.warm.cream,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.text.primary,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    ...SHADOWS.sm,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    ...SHADOWS.sm,
  },
});
