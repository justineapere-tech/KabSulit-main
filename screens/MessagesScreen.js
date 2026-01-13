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
  Platform,
  TextInput,
} from "react-native";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../config/supabase";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES, TYPOGRAPHY } from "../config/theme";
import ConfirmModal from "../components/ConfirmModal";
import Avatar from "../components/Avatar";

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
      style={styles.conversationCard}
      onPress={() =>
        navigation.navigate("Chat", {
          otherUserId: item.user_id,
          otherUserName: item.profile?.full_name || item.profile?.email || "User",
        })
      }
      activeOpacity={0.6}
    >
      <View style={styles.conversationMain}>
        <View style={styles.conversationContent}>
          {/* Avatar with status */}
          <View style={styles.avatarContainer}>
            <Avatar
              name={item.profile?.full_name || item.profile?.email || "User"}
              size="lg"
            />
            {item.unreadCount > 0 && (
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Message Content */}
          <View style={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.profile?.full_name || item.profile?.email || "User"}
              </Text>
              <View style={styles.metaInfo}>
                <Text style={styles.timestamp}>
                  {formatTime(item.lastMessage.created_at)}
                </Text>
              </View>
            </View>
            
            <View style={styles.messageRow}>
              <Text
                style={[
                  styles.messagePreview,
                  item.unreadCount > 0 && styles.messagePreviewUnread,
                ]}
                numberOfLines={2}
              >
                {item.lastMessage.content}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button - Swipe-like action */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            tab === "archived" 
              ? unarchiveConversation(item.user_id)
              : handleDeleteConversation(item.user_id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconContainer, tab === "archived" && styles.actionIconContainerRestore]}>
            <Ionicons 
              name={tab === "archived" ? "arrow-undo-outline" : "trash-outline"} 
              size={20} 
              color={tab === "archived" ? COLORS.primary.main : COLORS.semantic.error}
            />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary.main} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Clean Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Chats</Text>
            </View>
          </View>
        </View>

        {/* Search Bar for Chats */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search chats"
              placeholderTextColor={COLORS.text.tertiary}
            />
          </View>
        </View>
      </View>

      {/* Conversations List with Enhanced Styling */}
      <FlatList
        data={activeTab === "active" ? conversations : archivedConversations}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => renderConversationItem(item, activeTab)}
        contentContainerStyle={[
          styles.listContainer,
          (activeTab === "active" ? conversations.length : archivedConversations.length) === 0 && styles.listContainerEmpty
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.main}
            colors={[COLORS.primary.main]}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons 
                  name={activeTab === "active" ? "chatbubbles-outline" : "cube-outline"}
                  size={64} 
                  color={COLORS.text.tertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "active" ? "No messages yet" : "No archived conversations"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "active" 
                  ? "Start chatting with sellers and buyers\nfrom the marketplace" 
                  : "Conversations you archive will\nappear here for later"}
              </Text>
              {activeTab === "active" && (
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate("Feed")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyButtonText}>Browse Marketplace</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      <ConfirmModal
        visible={deleteModalVisible}
        title="Archive Conversation"
        message="Archive this conversation? You can restore it anytime from the Archived tab."
        onConfirm={deleteConversation}
        onCancel={() => setDeleteModalVisible(false)}
        confirmText="Archive"
        cancelText="Cancel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warm.cream,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warm.cream,
  },

  loadingText: {
    marginTop: SPACING.md,
    fontSize: 15,
    color: COLORS.text.secondary,
  },

  // Header - Clean minimal style like reference
  headerWrapper: {
    backgroundColor: COLORS.warm.cream,
    paddingBottom: 0,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  // Search bar for chats
  searchSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.base,
    height: 44,
    ...SHADOWS.sm,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
    color: COLORS.text.tertiary,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
  },

  // Tab Design - Hidden for cleaner look
  tabWrapper: {
    display: 'none',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.tertiary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxs,
  },

  tab: {
    flex: 1,
  },

  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },

  tabContentActive: {
    backgroundColor: COLORS.white,
  },

  tabIcon: {
    fontSize: 16,
    opacity: 0.7,
  },

  tabIconActive: {
    opacity: 1,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  tabTextActive: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },

  tabBadge: {
    backgroundColor: COLORS.surface.tertiary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBadgeActive: {
    backgroundColor: COLORS.primary.main,
  },

  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },

  tabBadgeTextActive: {
    color: COLORS.white,
  },

  // List Container
  listContainer: {
    paddingTop: SPACING.xs,
  },

  listContainerEmpty: {
    flexGrow: 1,
  },

  // Conversation Card - Clean minimal card
  conversationCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },

  conversationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  conversationContent: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.base,
    alignItems: 'center',
    paddingRight: SPACING.xs,
  },

  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },

  avatarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  avatarBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },

  messageContent: {
    flex: 1,
    justifyContent: 'center',
  },

  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },

  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timestamp: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
    marginRight: SPACING.sm,
  },

  messagePreview: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.secondary,
  },

  messagePreviewUnread: {
    color: COLORS.text.primary,
    fontWeight: '500',
  },

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.base,
    display: 'none',
  },

  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionIconContainerRestore: {
    backgroundColor: COLORS.primary.container,
  },

  actionIcon: {
    fontSize: 20,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.huge,
  },

  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary.container,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },

  emptyButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },

  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
