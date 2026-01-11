import React, { useState, useEffect } from 'react';
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
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES, TYPOGRAPHY } from '../config/theme';
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
                  <Text key={star} style={styles.ratingIcon}>
                    {star <= comment.rating ? '⭐' : '☆'}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
        {currentUser?.id === comment.user_id && (
          <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
            <Text style={styles.deleteIcon}>🗑️</Text>
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
          <Text style={styles.backIcon}>←</Text>
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(comment) => comment.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
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
                <Text style={styles.starIcon}>
                  {star <= rating ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.commentInputWrapper}>
          <TextInput
            style={styles.commentInput}
            placeholder="Share your thoughts..."
            placeholderTextColor={COLORS.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!commenting}
          />
          <Button
            title={commenting ? '' : '→'}
            onPress={handleAddComment}
            disabled={commenting || !commentText.trim()}
            variant="primary"
            style={styles.submitButton}
          >
            {commenting && <ActivityIndicator size="small" color={COLORS.white} />}
          </Button>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '700',
  },
  headerTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.white,
  },
  itemPreview: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  itemTitle: {
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  itemPrice: {
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.secondary,
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
    ...TYPOGRAPHY.styles.h5,
    color: COLORS.text,
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
    color: COLORS.error,
  },
  commentText: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  commentTime: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
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
    ...TYPOGRAPHY.styles.h4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.styles.body,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.sm,
    ...SHADOWS.sm,
  },
  ratingSelector: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ratingLabel: {
    ...TYPOGRAPHY.styles.caption,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.styles.body,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    padding: 0,
  },
});
