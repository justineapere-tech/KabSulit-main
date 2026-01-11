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
import { supabase } from '../config/supabase';

export default function ChatScreen({ route }) {
  const { otherUserId, otherUserName } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [user, setUser] = useState(null);
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

    // Optimistic update - add message to UI immediately
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: trimmedText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      console.log('Sending message:', { sender_id: user.id, receiver_id: otherUserId, content: trimmedText });
      const { error } = await supabase.from('messages').insert([
        {
          sender_id: user.id,
          receiver_id: otherUserId,
          content: trimmedText,
        },
      ]);
      if (error) {
        console.error('Send message error:', error);
        // Remove optimistic message if send failed
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      } else {
        console.log('Message sent successfully');
      }
    } catch (error) {
      console.error('Send message exception:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    }
  };

  const renderItem = ({ item }) => {
    const mine = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, mine ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, mine ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={mine ? styles.msgTextRight : styles.msgTextLeft}>{item.content}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{otherUserName || 'Chat'}</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  list: { padding: 12, paddingBottom: 20 },
  msgRow: { marginVertical: 6, flexDirection: 'row' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 8 },
  bubbleLeft: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eaeaea' },
  bubbleRight: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
  msgTextLeft: { color: '#333' },
  msgTextRight: { color: '#fff' },
  time: { fontSize: 10, color: '#999', marginTop: 6 },
  inputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginRight: 8 },
  sendBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: '700' },
});
