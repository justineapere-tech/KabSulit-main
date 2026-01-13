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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../config/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../config/theme';

import Avatar from '../components/Avatar';


export default function ChatScreen({ route, navigation }) {
  const { otherUserId, otherUserName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
  const flatRef = useRef(null);

  // Hide the default navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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


  const renderItem = ({ item, index }) => {
    const mine = item.sender_id === user?.id;
    const isTemp = typeof item.id === 'string' && item.id.startsWith('temp-');
    
    // Check if we should show date separator
    const currentDate = new Date(item.created_at).toDateString();
    const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
    const showDateSeparator = currentDate !== prevDate;
    
    // Check if messages are grouped (within 2 minutes of each other from same sender)
    const nextMessage = messages[index + 1];
    const isGrouped = nextMessage && 
      nextMessage.sender_id === item.sender_id && 
      (new Date(nextMessage.created_at) - new Date(item.created_at)) < 120000;
    
    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>
              {formatDateSeparator(item.created_at)}
            </Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}
        <View style={[styles.messageWrapper, mine ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
          {!mine && (
            <View style={styles.avatarContainer}>
              <Avatar name={otherUserName || 'User'} size="sm" />
            </View>
          )}
          <View style={styles.messageContent}>
            <View
              style={[
                styles.messageBubble,
                mine ? styles.bubbleRight : styles.bubbleLeft,
                isTemp && styles.messagePending,
                !isGrouped && (mine ? styles.bubbleTailRight : styles.bubbleTailLeft),
              ]}
            >
              <Text style={[styles.messageText, mine ? styles.messageTextRight : styles.messageTextLeft]}>
                {item.content}
              </Text>
            </View>
            <View style={[styles.messageMetadata, mine && styles.messageMetadataRight]}>
              <Text style={styles.messageTime}>
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {mine && (
                <Text style={styles.messageStatus}>
                  {isTemp ? 'Sending...' : item.is_read ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
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
      {/* Chat Header with Gradient Effect */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerContent}
            onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}
            activeOpacity={0.7}
          >
            <View style={styles.avatarWrapper}>
              <Avatar
                name={otherUserName || 'User'}
                size="lg"
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{otherUserName || 'Chat'}</Text>
              <Text style={styles.headerStatus}>Active now</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List with Empty State */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Start the conversation with {otherUserName}!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modern Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
          />
          
          {text.trim() && (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Delete conversation modal removed */}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary.container,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary.container,
  },
  
  // Header - Clean minimal style
  header: {
    backgroundColor: COLORS.warm.cream,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.text.primary,
    fontWeight: '400',
    lineHeight: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.warm.cream,
  },
  headerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 17,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 20,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Messages List
  messagesList: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  
  // Date Separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '600',
    paddingHorizontal: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Message Bubbles - WhatsApp-like style
  messageWrapper: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  messageWrapperLeft: {
    justifyContent: 'flex-start',
  },
  messageWrapperRight: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 28,
    marginRight: SPACING.sm,
    marginBottom: 4,
  },
  messageContent: {
    maxWidth: '78%',
  },
  messageBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 18,
  },
  bubbleLeft: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...SHADOWS.xs,
  },
  bubbleRight: {
    backgroundColor: COLORS.message.sent,
    borderBottomRightRadius: 4,
  },
  bubbleTailLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleTailRight: {
    borderBottomRightRadius: 4,
  },
  messagePending: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: COLORS.text.primary,
  },
  messageTextRight: {
    color: COLORS.text.primary,
  },
  messageMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.xs,
  },
  messageMetadataRight: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  messageStatus: {
    fontSize: 11,
    color: COLORS.primary.light,
    marginLeft: 4,
    fontWeight: '600',
  },
  
  // Input Area - Clean minimal
  inputContainer: {
    backgroundColor: COLORS.warm.cream,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    minHeight: 44,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingVertical: SPACING.sm,
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
  sendButtonIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  }
});
