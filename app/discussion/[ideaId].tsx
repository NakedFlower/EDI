import { useState } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function DiscussionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ideaId: ideaIdParam } = useLocalSearchParams<{ ideaId: string }>();
  const ideaId = parseInt(ideaIdParam ?? "0", 10);
  const [commentText, setCommentText] = useState("");

  const { data: idea, isLoading: ideaLoading } = trpc.community.getIdea.useQuery(
    { id: ideaId },
    { enabled: ideaId > 0 }
  );

  const {
    data: comments,
    isLoading: commentsLoading,
    refetch: refetchComments,
  } = trpc.community.comments.useQuery({ ideaId }, { enabled: ideaId > 0 });

  const addCommentMutation = trpc.community.addComment.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommentText("");
      refetchComments();
    },
    onError: (err) => Alert.alert("오류", err.message),
  });

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCommentMutation.mutate({ ideaId, content: text });
  };

  if (ideaLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!idea) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>아이디어를 찾을 수 없습니다</Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <Text style={[styles.backLink, { color: colors.primary }]}>돌아가기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const renderIdeaSection = (label: string, value: string | null) => {
    if (!value) return null;
    return (
      <View style={styles.ideaSection}>
        <Text style={[styles.ideaSectionLabel, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.ideaSectionText, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  };

  const inputBottomPadding = Math.max(insets.bottom, 8);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            토론
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={comments ?? []}
          keyExtractor={(item) => item.id.toString()}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.ideaContent}>
              {/* Idea Details */}
              <Text style={[styles.ideaTitle, { color: colors.foreground }]}>{idea.title}</Text>
              <View style={styles.authorRow}>
                <IconSymbol name="person.crop.circle" size={16} color={colors.muted} />
                <Text style={[styles.authorName, { color: colors.muted }]}>
                  {idea.authorName ?? "익명"}
                </Text>
                <Text style={[styles.dot, { color: colors.muted }]}>·</Text>
                <Text style={[styles.dateText, { color: colors.muted }]}>
                  {new Date(idea.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>

              {renderIdeaSection("설명", idea.description)}
              {renderIdeaSection("문제점", idea.problem)}
              {renderIdeaSection("타겟 사용자", idea.targetUsers)}
              {renderIdeaSection("솔루션", idea.solution)}
              {renderIdeaSection("메모", idea.notes)}

              {/* Comments Header */}
              <View style={[styles.commentsHeader, { borderTopColor: colors.border }]}>
                <IconSymbol name="bubble.left.fill" size={18} color={colors.foreground} />
                <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
                  댓글 ({comments?.length ?? 0})
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            commentsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.emptyComments}>
                <Text style={[styles.emptyCommentsText, { color: colors.muted }]}>
                  아직 댓글이 없습니다. 첫 번째 의견을 남겨보세요!
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={[styles.commentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAuthorRow}>
                  <IconSymbol name="person.crop.circle" size={14} color={colors.muted} />
                  <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                    {item.authorName ?? "익명"}
                  </Text>
                </View>
                <Text style={[styles.commentDate, { color: colors.muted }]}>
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>
              <Text style={[styles.commentText, { color: colors.foreground }]}>{item.content}</Text>
            </View>
          )}
        />

        {/* Comment Input */}
        <View
          style={[
            styles.inputContainer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: inputBottomPadding,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="의견을 남겨보세요..."
            placeholderTextColor={colors.muted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleAddComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: commentText.trim() ? colors.primary : colors.muted + "30" },
              pressed && commentText.trim() && { transform: [{ scale: 0.95 }], opacity: 0.9 },
            ]}
          >
            {addCommentMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color={commentText.trim() ? "#FFFFFF" : colors.muted} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 16, fontWeight: "500" },
  backLink: { fontSize: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  ideaContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  ideaTitle: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3, lineHeight: 30 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorName: { fontSize: 14 },
  dot: { fontSize: 14 },
  dateText: { fontSize: 13 },
  ideaSection: { gap: 4 },
  ideaSectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  ideaSectionText: { fontSize: 15, lineHeight: 22 },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 0.5,
    paddingTop: 16,
    marginTop: 8,
  },
  commentsTitle: { fontSize: 17, fontWeight: "600" },
  listContent: { paddingBottom: 20 },
  emptyComments: { paddingHorizontal: 16, paddingVertical: 24 },
  emptyCommentsText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  commentCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAuthorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  commentAuthor: { fontSize: 14, fontWeight: "500" },
  commentDate: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
