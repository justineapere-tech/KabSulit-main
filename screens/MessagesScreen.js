import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from "../config/theme";
import ConfirmModal from "../components/ConfirmModal";

export default function MessagesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "archived"
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    let mounted = true;
    
    const initScreen = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setCurrentUser(user);
        loadConversations();
      }
    };

    initScreen();

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
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setConversations([]);
        setArchivedConversations([]);
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

      // Fetch archived conversations for this user (include timestamp for fallback ordering)
      const { data: archived, error: archiveError } = await supabase
        .from("conversation_visibility")
        .select("other_user_id, hidden_at")
        .eq("user_id", user.id);

      const archivedUserIds = archived?.map((a) => a.other_user_id) || [];
      const archivedHiddenAtMap = archived?.reduce((acc, row) => {
        acc[row.other_user_id] = row.hidden_at;
        return acc;
      }, {}) || {};

      // Group messages by conversation
      const convoMap = {};
      msgs.forEach((m) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!convoMap[otherId]) {
          convoMap[otherId] = {
            lastMessage: m,
            unreadCount: m.receiver_id === user.id && !m.is_read ? 1 : 0,
          };
        } else if (m.receiver_id === user.id && !m.is_read) {
          convoMap[otherId].unreadCount += 1;
        }
      });

      const otherIds = Object.keys(convoMap);
      
      // Fetch profiles for both message conversations and archived conversations
      const allUserIds = [...new Set([...otherIds, ...archivedUserIds])];
      let profiles = [];
      if (allUserIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", allUserIds);
        profiles = profs || [];
      }

      const conversationList = otherIds
        .map((id) => ({
          user_id: id,
          lastMessage: convoMap[id].lastMessage,
          unreadCount: convoMap[id].unreadCount,
          profile: profiles.find((p) => p.id === id) || null,
        }))
        .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

      // Separate active and archived conversations
      const active = conversationList.filter((c) => !archivedUserIds.includes(c.user_id));
      const archivedList = conversationList.filter((c) => archivedUserIds.includes(c.user_id));

      // Add archived conversations that were previously hidden (no messages returned due to RLS)
      const missingArchived = archivedUserIds
        .filter((id) => !archivedList.some((c) => c.user_id === id))
        .map((id) => ({
          user_id: id,
          lastMessage: {
            content: "Archived conversation",
            created_at: archivedHiddenAtMap[id] || new Date().toISOString(),
          },
          unreadCount: 0,
          profile: profiles.find((p) => p.id === id) || null,
          archivedAt: archivedHiddenAtMap[id] || null,
          isArchivedOnly: true,
        }));

      setConversations(active);
      setArchivedConversations([...archivedList, ...missingArchived].sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)));
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
      setArchivedConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleDeleteConversation = (userId) => {
    setDeleteUserId(userId);
    setDeleteModalVisible(true);
  };

  const deleteConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!deleteUserId) {
        throw new Error("No conversation selected for deletion");
      }

      console.log("Archiving conversation:", { userId: user.id, otherUserId: deleteUserId });

      // Move conversation to archived state
      const targetUserId = deleteUserId;
      setDeleteUserId(null);
      setDeleteModalVisible(false);

      // Move from active to archived in state
      const conversation = conversations.find((c) => c.user_id === targetUserId);
      if (conversation) {
        setConversations((prev) => prev.filter((c) => c.user_id !== targetUserId));
        setArchivedConversations((prev) => [conversation, ...prev]);
      }

      // Insert into conversation_visibility table to archive this conversation
      const { error } = await supabase
        .from("conversation_visibility")
        .insert({
          user_id: user.id,
          other_user_id: targetUserId,
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
            .eq("other_user_id", targetUserId);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw error;
        }
      }

      console.log("Conversation archived successfully");

    } catch (error) {
      console.error("Archive conversation failed:", error);
      Alert.alert("Error", error.message || "Failed to archive conversation");
      loadConversations();
    }
  };

  const unarchiveConversation = async (userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Unarchiving conversation:", { userId: user.id, otherUserId: userId });

      // Move conversation to active state
      const conversation = archivedConversations.find((c) => c.user_id === userId);
      if (conversation) {
        setArchivedConversations((prev) => prev.filter((c) => c.user_id !== userId));
        setConversations((prev) => [conversation, ...prev]);
      }

      // Delete from conversation_visibility table to unarchive
      const { error } = await supabase
        .from("conversation_visibility")
        .delete()
        .eq("user_id", user.id)
        .eq("other_user_id", userId);

      if (error) {
        throw error;
      }

      console.log("Conversation unarchived successfully");

    } catch (error) {
      console.error("Unarchive conversation failed:", error);
      Alert.alert("Error", error.message || "Failed to unarchive conversation");
      loadConversations();
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMinutes = Math.floor((now - messageDate) / 60000);
    
    if (diffMinutes < 1) return "now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderConversationItem = (item, tab) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() =>
        navigation.navigate("Chat", {
          otherUserId: item.user_id,
          otherUserName: item.profile?.full_name || item.profile?.email || "User",
        })
      }
      activeOpacity={0.7}
    >
      {/* Avatar with Online Indicator */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.profile?.full_name
              ? item.profile.full_name.charAt(0).toUpperCase()
              : (item.profile?.email || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[styles.onlineIndicator, styles.onlineIndicatorActive]} />
      </View>

      {/* Message Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.profile?.full_name || item.profile?.email || "User"}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.lastMessage.created_at)}</Text>
        </View>
        <View style={styles.messagePreview}>
          <Text
            style={[
              styles.previewText,
              item.unreadCount > 0 && styles.unreadPreviewText,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage.content}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => 
          tab === "archived" 
            ? unarchiveConversation(item.user_id)
            : handleDeleteConversation(item.user_id)
        }
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteIcon}>{tab === "archived" ? "📥" : "🗑️"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === "active" ? conversations.length : archivedConversations.length} {activeTab === "active" ? "conversation" : "archived"}
          </Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.tabActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            Active {conversations.length > 0 && `(${conversations.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "archived" && styles.tabActive]}
          onPress={() => setActiveTab("archived")}
        >
          <Text style={[styles.tabText, activeTab === "archived" && styles.tabTextActive]}>
            Archived {archivedConversations.length > 0 && `(${archivedConversations.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={activeTab === "active" ? conversations : archivedConversations}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => renderConversationItem(item, activeTab)}
        contentContainerStyle={(activeTab === "active" ? conversations.length : archivedConversations.length) === 0 ? { flex: 1 } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>
                {activeTab === "active" ? "No messages yet" : "No archived conversations"}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === "active" 
                  ? "Start a conversation by messaging a seller" 
                  : "Archived conversations will appear here"}
              </Text>
            </View>
          )
        }
      />

      <ConfirmModal
        visible={deleteModalVisible}
        title="Delete Conversation"
        message={`Are you sure you want to delete this conversation? This cannot be undone.`}
        onConfirm={deleteConversation}
        onCancel={() => setDeleteModalVisible(false)}
        confirmText="Delete"
        cancelText="Cancel"
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
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    fontWeight: "700",
  },
  onlineIndicator: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    bottom: 0,
    right: 0,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  onlineIndicatorActive: {
    backgroundColor: "#31a24c",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  timestamp: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginLeft: SPACING.sm,
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: "400",
  },
  unreadPreviewText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  unreadCount: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    fontWeight: "700",
  },
  deleteButton: {
    paddingLeft: SPACING.lg,
    paddingVertical: SPACING.md,
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
