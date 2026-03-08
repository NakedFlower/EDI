import { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function IdeaDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ideaId = parseInt(id ?? "0", 10);
  const [isEditing, setIsEditing] = useState(false);

  const { data: idea, isLoading, refetch } = trpc.ideas.get.useQuery(
    { id: ideaId },
    { enabled: ideaId > 0 }
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [solution, setSolution] = useState("");
  const [notes, setNotes] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);

  const updateMutation = trpc.ideas.update.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      refetch();
    },
    onError: (err) => Alert.alert("오류", err.message),
  });

  const deleteMutation = trpc.ideas.delete.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.back();
    },
  });

  const startEditing = () => {
    if (!idea) return;
    setTitle(idea.title);
    setDescription(idea.description ?? "");
    setProblem(idea.problem ?? "");
    setTargetUsers(idea.targetUsers ?? "");
    setSolution(idea.solution ?? "");
    setNotes(idea.notes ?? "");
    setEditIsPublic(idea.isPublic);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("제목 필요", "제목을 입력해 주세요.");
      return;
    }
    updateMutation.mutate({
      id: ideaId,
      title: title.trim(),
      description: description.trim() || null,
      problem: problem.trim() || null,
      targetUsers: targetUsers.trim() || null,
      solution: solution.trim() || null,
      notes: notes.trim() || null,
      isPublic: editIsPublic,
    });
  };

  const handleDelete = () => {
    Alert.alert("아이디어 삭제", "이 작업은 되돌릴 수 없습니다.", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteMutation.mutate({ id: ideaId }) },
    ]);
  };

  if (isLoading || !idea) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const renderSection = (label: string, value: string | null, editValue?: string, onEdit?: (t: string) => void) => {
    if (!isEditing && !value) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>{label}</Text>
        {isEditing && onEdit ? (
          <TextInput
            style={[styles.editInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={editValue}
            onChangeText={onEdit}
            multiline
            textAlignVertical="top"
            placeholder={`${label} 입력...`}
            placeholderTextColor={colors.muted}
          />
        ) : (
          <Text style={[styles.sectionText, { color: colors.foreground }]}>{value}</Text>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <Pressable onPress={() => setIsEditing(false)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={[styles.headerActionText, { color: colors.muted }]}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>저장</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={startEditing} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <IconSymbol name="pencil" size={22} color={colors.primary} />
                </Pressable>
                <Pressable onPress={handleDelete} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <IconSymbol name="trash.fill" size={22} color={colors.error} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.titleSection}>
            {isEditing ? (
              <TextInput
                style={[styles.titleInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={title}
                onChangeText={setTitle}
                placeholder="아이디어 제목"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            ) : (
              <Text style={[styles.ideaTitle, { color: colors.foreground }]}>{idea.title}</Text>
            )}

            {/* Privacy Badge - editable in edit mode */}
            {isEditing ? (
              <View style={styles.privacyRow}>
                <Pressable
                  onPress={() => {
                    setEditIsPublic(false);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={({ pressed }) => [
                    styles.privacyOption,
                    {
                      backgroundColor: !editIsPublic ? colors.primary + "15" : colors.surface,
                      borderColor: !editIsPublic ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name="lock.fill" size={16} color={!editIsPublic ? colors.primary : colors.muted} />
                  <Text style={[styles.privacyOptionText, { color: !editIsPublic ? colors.primary : colors.muted }]}>
                    비공개
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditIsPublic(true);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={({ pressed }) => [
                    styles.privacyOption,
                    {
                      backgroundColor: editIsPublic ? colors.success + "15" : colors.surface,
                      borderColor: editIsPublic ? colors.success : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name="globe" size={16} color={editIsPublic ? colors.success : colors.muted} />
                  <Text style={[styles.privacyOptionText, { color: editIsPublic ? colors.success : colors.muted }]}>
                    공개
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[
                styles.privacyBadge,
                {
                  backgroundColor: idea.isPublic ? colors.success + "15" : colors.muted + "15",
                  borderColor: idea.isPublic ? colors.success : colors.muted,
                },
              ]}>
                <IconSymbol
                  name={idea.isPublic ? "globe" : "lock.fill"}
                  size={14}
                  color={idea.isPublic ? colors.success : colors.muted}
                />
                <Text style={[styles.privacyText, { color: idea.isPublic ? colors.success : colors.muted }]}>
                  {idea.isPublic ? "공개" : "비공개"}
                </Text>
              </View>
            )}
          </View>

          {/* Sections */}
          {renderSection("설명", idea.description, description, setDescription)}
          {renderSection("문제점", idea.problem, problem, setProblem)}
          {renderSection("타겟 사용자", idea.targetUsers, targetUsers, setTargetUsers)}
          {renderSection("솔루션", idea.solution, solution, setSolution)}
          {renderSection("메모", idea.notes, notes, setNotes)}

          {/* Empty state for editing */}
          {isEditing && !idea.description && !idea.problem && !idea.targetUsers && !idea.solution && !idea.notes && (
            <>
              {renderSection("설명", "", description, setDescription)}
              {renderSection("문제점", "", problem, setProblem)}
              {renderSection("타겟 사용자", "", targetUsers, setTargetUsers)}
              {renderSection("솔루션", "", solution, setSolution)}
              {renderSection("메모", "", notes, setNotes)}
            </>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/coach/${ideaId}` as any);
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.accent + "15", borderColor: colors.accent },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="sparkles" size={20} color={colors.accent} />
                <Text style={[styles.actionButtonText, { color: colors.accent }]}>AI 코치와 대화</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/history/${ideaId}` as any);
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.primary + "15", borderColor: colors.primary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>아이디어 현황</Text>
              </Pressable>
              {idea.isPublic && (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/discussion/${ideaId}` as any);
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: colors.border + "60", borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <IconSymbol name="bubble.left.fill" size={20} color={colors.muted} />
                  <Text style={[styles.actionButtonText, { color: colors.muted }]}>댓글 보기</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Meta */}
          <View style={[styles.metaSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.metaText, { color: colors.muted }]}>
              생성일 {new Date(idea.createdAt).toLocaleDateString("ko-KR")}
            </Text>
            <Text style={[styles.metaText, { color: colors.muted }]}>
              수정일 {new Date(idea.updatedAt).toLocaleDateString("ko-KR")}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerActionText: { fontSize: 16 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18 },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  titleSection: { gap: 10 },
  ideaTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3, lineHeight: 32 },
  titleInput: {
    fontSize: 20,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  privacyRow: {
    flexDirection: "row",
    gap: 10,
  },
  privacyOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  privacyOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  privacyText: { fontSize: 13, fontWeight: "500" },
  section: { gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 2 },
  sectionText: { fontSize: 15, lineHeight: 24 },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },
  actionButtons: { gap: 12, marginTop: 8 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionButtonText: { fontSize: 16, fontWeight: "600" },
  metaSection: { borderTopWidth: 0.5, paddingTop: 16, gap: 4 },
  metaText: { fontSize: 13 },
});
