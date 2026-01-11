import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from "../config/theme";

export default function MessagesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadConversations();

    const subscription = supabase
      .channel("messages_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        if (mounted) {
          loadConversations();
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log("MessagesScreen focused, refreshing conversations");
      loadConversations();
    }, [])
  );

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: msgs, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const convoMap = {};
      msgs.forEach((m) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!convoMap[otherId]) {
          convoMap[otherId] = m;
        }
      });

      const otherIds = Object.keys(convoMap);
      let profiles = [];
      if (otherIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", otherIds);
        profiles = profs || [];
      }

      const conversationList = otherIds.map((id) => ({
        user_id: id,
        lastMessage: convoMap[id],
        profile: profiles.find((p) => p.id === id) || null,
      }));

      setConversations(conversationList);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = (userId) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(userId);
              const { data: { user } } = await supabase.auth.getUser();
              
              // Delete all messages in this conversation
              const { error } = await supabase
                .from("messages")
                .delete()
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);

              if (error) throw error;
              loadConversations();
              Alert.alert("Success", "Conversation deleted");
            } catch (error) {
              Alert.alert("Error", error.message || "Failed to delete conversation");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.contentArea}
        onPress={() =>
          navigation.navigate("Chat", {
            otherUserId: item.user_id,
            otherUserName: item.profile?.full_name || item.profile?.email || "User",
          })
        }
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.avatar}
          onPress={() =>
            navigation.navigate("Profile", { userId: item.user_id })
          }
        >
          <Text style={styles.avatarText}>
            {item.profile?.full_name
              ? item.profile.full_name.charAt(0).toUpperCase()
              : (item.profile?.email || "U").charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={styles.name}>
            {item.profile?.full_name || item.profile?.email || "User"}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessage?.content || ""}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.user_id)}
        disabled={deletingId === item.user_id}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : {}}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation by messaging a seller</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: "700",
    color: COLORS.white,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contentArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  preview: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  arrow: {
    fontSize: SIZES.lg,
    color: COLORS.primary,
  },
  deleteButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIcon: {
    fontSize: SIZES.lg,
    color: COLORS.error,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    color: COLORS.textSecondary,
    fontSize: SIZES.sm,
    textAlign: "center",
  },
});
