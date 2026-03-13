import { useCallback, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { AuthModal } from "@/app/auth-modal";

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const {
    data: ideas,
    isLoading,
    refetch,
  } = trpc.ideas.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: commentCounts, refetch: refetchCounts } = trpc.ideas.commentCounts.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const deleteMutation = trpc.ideas.delete.useMutation({
    onSuccess: () => refetch(),
  });

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
        refetchCounts();
      }
    }, [isAuthenticated])
  );

  const filteredIdeas = ideas?.filter((idea) =>
    searchQuery
      ? idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const handleDelete = (id: number, title: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    Alert.alert("아이디어 삭제", `"${title}"을(를) 정말 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate({ id });
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
      },
    ]);
  };

  if (authLoading) {
    return (
      <ScreenContainer className="px-6">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const handleNewIdea = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    router.push("/new-idea");
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-0">
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>아이디어 창고</Text>
          </View>
        </View>
        
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="lightbulb.fill" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            나만의 아이디어를 기록하세요
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            AI 멘토와 함께{"\n"}아이디어를 구체화할 수 있습니다
          </Text>
        </View>

        <Pressable
          onPress={handleNewIdea}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.9 }] },
          ]}
        >
          <IconSymbol name="plus" size={28} color="#FFFFFF" />
        </Pressable>

        <AuthModal 
          visible={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-0">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>내 창고</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            아이디어 {ideas?.length ?? 0}개
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="아이디어 검색..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Ideas List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredIdeas && filteredIdeas.length > 0 ? (
        <FlatList
          data={filteredIdeas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { refetch(); refetchCounts(); }} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const count = commentCounts?.find((c) => c.ideaId === item.id)?.count ?? 0;
            return (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/idea/${item.id}` as any);
                }}
                onLongPress={() => handleDelete(item.id, item.title)}
                style={({ pressed }) => [
                  styles.ideaCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.ideaCardHeader}>
                  <Text style={[styles.ideaTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.ideaBadges}>
                    {item.isPublic && count > 0 && (
                      <View style={[styles.commentBadge, { backgroundColor: colors.accent }]}>
                        <IconSymbol name="bubble.left.fill" size={10} color="#FFFFFF" />
                        <Text style={styles.commentBadgeText}>{count}</Text>
                      </View>
                    )}
                    <IconSymbol
                      name={item.isPublic ? "globe" : "lock.fill"}
                      size={14}
                      color={item.isPublic ? colors.success : colors.muted}
                    />
                  </View>
                </View>
                {item.description ? (
                  <Text style={[styles.ideaDescription, { color: colors.muted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <View style={styles.ideaCardFooter}>
                  <Text style={[styles.ideaDate, { color: colors.muted }]}>
                    {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="lightbulb.fill" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery ? "검색 결과가 없습니다" : "창고가 비어 있습니다"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            {searchQuery
              ? "다른 검색어를 시도해 보세요"
              : "+ 버튼을 눌러 첫 번째 아이디어를 기록하세요"}
          </Text>
        </View>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleNewIdea();
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
        ]}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  ideaCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  ideaCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ideaTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  ideaBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  commentBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  ideaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ideaCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ideaDate: {
    fontSize: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  signInButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 16,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
