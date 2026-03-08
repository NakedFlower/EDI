import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export default function MentorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ideaId: ideaIdParam } = useLocalSearchParams<{ ideaId: string }>();
  const ideaId = parseInt(ideaIdParam ?? "0", 10);
  const [inputText, setInputText] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading } = trpc.coach.getConversation.useQuery(
    { ideaId },
    { enabled: ideaId > 0 }
  );

  const sendMutation = trpc.coach.sendMessage.useMutation({
    onSuccess: (result) => {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: result.response,
          createdAt: new Date().toISOString(),
        },
      ]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: () => {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "오류가 발생했습니다. 다시 시도해 주세요.",
          createdAt: new Date().toISOString(),
        },
      ]);
    },
  });

  useEffect(() => {
    if (data?.messages && isFirstLoad) {
      setLocalMessages(
        data.messages.map((m) => ({
          id: m.id.toString(),
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: new Date(m.createdAt).toISOString(),
        }))
      );
      setIsFirstLoad(false);
    }
  }, [data?.messages, isFirstLoad]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || sendMutation.isPending) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLocalMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInputText("");
    sendMutation.mutate({ ideaId, message: text });
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageBubbleRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: colors.accent + "20" }]}>
            <IconSymbol name="sparkles" size={16} color={colors.accent} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.accent + "30" }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : colors.foreground },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  // Bottom padding for input bar: safe area bottom + tab bar is not present here
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
          <View style={styles.headerCenter}>
            <View style={[styles.mentorIcon, { backgroundColor: colors.accent + "20" }]}>
              <IconSymbol name="sparkles" size={16} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI 멘토</Text>
              <Text style={[styles.headerSubtitle, { color: colors.muted }]} numberOfLines={1}>
                {data?.idea?.title ?? "로딩 중..."}
              </Text>
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        {localMessages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accent + "15" }]}>
              <IconSymbol name="sparkles" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>대화를 시작하세요</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              AI 멘토에게 아이디어에 대해 설명해보세요.{"\n"}멘토가 질문을 통해 아이디어를 발전시키도록 도와줍니다.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={localMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Typing indicator */}
        {sendMutation.isPending && (
          <View style={[styles.typingRow]}>
            <View style={[styles.aiAvatar, { backgroundColor: colors.accent + "20" }]}>
              <IconSymbol name="sparkles" size={14} color={colors.accent} />
            </View>
            <View style={[styles.typingBubble, { backgroundColor: colors.surface }]}>
              <Text style={[styles.typingDots, { color: colors.muted }]}>생각 중...</Text>
            </View>
          </View>
        )}

        {/* Input */}
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
            placeholder="멘토에게 아이디어를 설명해보세요..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={5000}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.muted + "30",
              },
              pressed && inputText.trim() && { transform: [{ scale: 0.95 }], opacity: 0.9 },
            ]}
          >
            <IconSymbol name="arrow.up.circle.fill" size={22} color={inputText.trim() ? "#FFFFFF" : colors.muted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  mentorIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  headerSubtitle: { fontSize: 13, maxWidth: 200 },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "600" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  messagesList: { padding: 16, paddingBottom: 8, gap: 12 },
  messageBubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "85%" },
  userRow: { alignSelf: "flex-end" },
  aiRow: { alignSelf: "flex-start" },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "100%" },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  typingDots: { fontSize: 14, fontStyle: "italic" },
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
    maxHeight: 120,
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
