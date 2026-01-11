import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from '../config/theme';
import ConfirmModal from '../components/ConfirmModal';

export default function ChatScreen({ route, navigation }) {
  const { otherUserId, otherUserName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const flatRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (!user) return;

        await loadMessages(user.id);

        const subscription = supabase
          .channel('messages_chat')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            console.log('Real-time message received:', payload.new);
            const m = payload.new;
            // only add messages that belong to this chat (between the two users)
            const belongs =
              (m.sender_id === user.id && m.receiver_id === otherUserId) ||
              (m.sender_id === otherUserId && m.receiver_id === user.id);
            console.log('Message belongs to this chat:', belongs);
            if (belongs) {
              console.log('Adding real-time message to state');
              setMessages((prev) => [...prev, m]);
              // scroll to end
              setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
            }
          })
          .subscribe();

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Chat init error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [otherUserId]);

  const loadMessages = async (myId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      setMessages(data || []);
      
      // Mark all unread messages from otherUser as read
      const unreadMessages = (data || []).filter(m => m.receiver_id === myId && !m.is_read);
      if (unreadMessages.length > 0) {
        const unreadIds = unreadMessages.map(m => m.id);
        const { error: updateError } = await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
        
        if (updateError) {
          console.error('Error marking messages as read:', updateError);
        } else {
          console.log(`Marked ${unreadIds.length} messages as read`);
        }
      }
      
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !user) {
      console.log('Cannot send: text empty or no user');
      return;
    }
    const trimmedText = text.trim();
    setText('');

    // Create optimistic message with proper timestamp
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: trimmedText,
      created_at: new Date().toISOString(),
      is_optimistic: true,
    };

    // Add to messages immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately
    setTimeout(() => {
      flatRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      console.log('Sending message:', { sender_id: user.id, receiver_id: otherUserId, content: trimmedText });
      
      const { data, error } = await supabase.from('messages').insert([
        {
          sender_id: user.id,
          receiver_id: otherUserId,
          content: trimmedText,
        },
      ]).select();

      if (error) {
        console.error('Send message error:', error);
        // Remove optimistic message if send failed
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      } else {
        console.log('Message sent successfully:', data);
        // Replace optimistic message with actual message from DB
        if (data && data[0]) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? data[0] : m))
          );
        }
      }
    } catch (error) {
      console.error('Send message exception:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    }
  };

  const deleteConversation = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Starting soft-delete for conversation:", { userId: user.id, otherUserId });

      // Insert into conversation_visibility table to hide this conversation
      const { error } = await supabase
        .from("conversation_visibility")
        .insert({
          user_id: user.id,
          other_user_id: otherUserId,
          hidden_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        // If it's a unique constraint error, update existing record instead
        if (error.code === "23505") {
          const { error: updateError } = await supabase
            .from("conversation_visibility")
            .update({ hidden_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("other_user_id", otherUserId);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw error;
        }
      }

      console.log("Soft-delete complete - conversation hidden for current user");
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (error) {
      console.error("Delete conversation exception:", error);
      Alert.alert("Error", error.message || "Failed to delete conversation");
    }
  };

  const renderItem = ({ item }) => {
    const mine = item.sender_id === user?.id;
    const isTemp = typeof item.id === 'string' && item.id.startsWith('temp-');
    
    return (
      <View style={[styles.messageWrapper, mine ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View
          style={[
            styles.messageBubble,
            mine ? styles.bubbleRight : styles.bubbleLeft,
            isTemp && styles.messagePending,
          ]}
        >
          <Text style={[styles.messageText, mine ? styles.messageTextRight : styles.messageTextLeft]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, mine ? styles.messageTimeRight : styles.messageTimeLeft]}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {mine && isTemp && (
          <Text style={styles.sendingIndicator}>⏳</Text>
        )}
        {mine && !isTemp && (
          <Text style={styles.readReceipt}>✓✓</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerContent}
          onPress={() => navigation.navigate('Profile', { userId: otherUserId })}
          activeOpacity={0.7}
        >
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUserName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{otherUserName || 'Chat'}</Text>
            <Text style={styles.headerStatus}>Active now</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Aa"
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Text style={styles.sendButtonText}>
              {text.trim() ? '↑' : '❤️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Conversation"
        message={`Are you sure you want to delete this conversation with ${otherUserName}? This cannot be undone.`}
        onConfirm={deleteConversation}
        onCancel={() => setDeleteModalVisible(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerAvatarText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerStatus: {
    fontSize: SIZES.xs,
    color: '#31a24c',
    fontWeight: '500',
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: SIZES.lg,
  },
  messagesList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginVertical: SPACING.sm,
    alignItems: 'flex-end',
  },
  messageWrapperLeft: {
    justifyContent: 'flex-start',
  },
  messageWrapperRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  bubbleLeft: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleRight: {
    backgroundColor: COLORS.primary,
  },
  messagePending: {
    opacity: 0.6,
  },
  messageText: {
    fontSize: SIZES.md,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  messageTextLeft: {
    color: COLORS.text,
  },
  messageTextRight: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: SIZES.xs,
  },
  messageTimeLeft: {
    color: COLORS.textSecondary,
  },
  messageTimeRight: {
    color: 'rgba(255,255,255,0.7)',
  },
  sendingIndicator: {
    fontSize: SIZES.sm,
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
  },
  readReceipt: {
    fontSize: SIZES.xs,
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 40,
    ...SHADOWS.small,
  },
  input: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: SPACING.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  sendButtonText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
});
