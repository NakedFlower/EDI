import { useCallback, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
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

export default function CommunityScreen() {
  const colors = useColors();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data: ideas, isLoading, refetch } = trpc.community.feed.useQuery(undefined, {
    enabled: true,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const handleIdeaPress = (ideaId: number) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/discussion/${ideaId}` as any);
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


  return (
    <ScreenContainer className="px-0">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>커뮤니티</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          공개된 아이디어를 살펴보세요
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : ideas && ideas.length > 0 ? (
        <FlatList
          data={ideas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <Pressable
              key={item.id}
              onPress={() => handleIdeaPress(item.id)}
              style={({ pressed }) => [
                styles.ideaCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.ideaTitle, { color: colors.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description ? (
                <Text style={[styles.ideaDescription, { color: colors.muted }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.ideaFooter}>
                <View style={styles.authorRow}>
                  <IconSymbol name="person.crop.circle" size={14} color={colors.muted} />
                  <Text style={[styles.authorName, { color: colors.muted }]}>
                    {item.authorName ?? "익명"}
                  </Text>
                </View>
                <Text style={[styles.ideaDate, { color: colors.muted }]}>
                  {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="person.2.fill" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>아직 공개된 아이디어가 없습니다</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            커뮤니티에 첫 번째 아이디어를 공유해 보세요
          </Text>
        </View>
      )}

      <AuthModal 
        visible={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
    gap: 10,
  },
  ideaCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  ideaTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  ideaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  ideaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    fontSize: 13,
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
});
