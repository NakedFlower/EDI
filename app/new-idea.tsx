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
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function NewIdeaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [solution, setSolution] = useState("");
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const createMutation = trpc.ideas.create.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    },
    onError: (error) => {
      Alert.alert("오류", error.message || "아이디어 생성에 실패했습니다");
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("제목 필요", "아이디어 제목을 입력해 주세요.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      problem: problem.trim() || null,
      targetUsers: targetUsers.trim() || null,
      solution: solution.trim() || null,
      notes: notes.trim() || null,
      isPublic,
    });
  };

  const renderField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    multiline = true
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldInputMultiline,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        returnKeyType={multiline ? "default" : "done"}
      />
    </View>
  );

  const formBottomPadding = Math.max(insets.bottom, 12) + 28;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>취소</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>새 아이디어</Text>
          <Pressable
            onPress={handleSave}
            disabled={createMutation.isPending}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              createMutation.isPending && { opacity: 0.5 },
            ]}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>저장</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.formContent, { paddingBottom: formBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          {renderField("제목 *", title, setTitle, "어떤 아이디어인가요?", false)}
          {renderField("설명", description, setDescription, "아이디어를 간단히 설명해 주세요...")}
          {renderField("문제점", problem, setProblem, "어떤 문제를 해결하나요?")}
          {renderField("타겟 사용자", targetUsers, setTargetUsers, "누가 사용하게 되나요?")}
          {renderField("솔루션", solution, setSolution, "어떻게 문제를 해결하나요?")}
          {renderField("메모", notes, setNotes, "추가 메모나 생각...")}

          {/* Privacy Toggle */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>공개 설정</Text>
            <View style={styles.privacyRow}>
              <Pressable
                onPress={() => {
                  setIsPublic(false);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={({ pressed }) => [
                  styles.privacyOption,
                  {
                    backgroundColor: !isPublic ? colors.primary + "15" : colors.surface,
                    borderColor: !isPublic ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="lock.fill" size={18} color={!isPublic ? colors.primary : colors.muted} />
                <Text style={[styles.privacyText, { color: !isPublic ? colors.primary : colors.muted }]}>
                  비공개
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsPublic(true);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={({ pressed }) => [
                  styles.privacyOption,
                  {
                    backgroundColor: isPublic ? colors.success + "15" : colors.surface,
                    borderColor: isPublic ? colors.success : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="globe" size={18} color={isPublic ? colors.success : colors.muted} />
                <Text style={[styles.privacyText, { color: isPublic ? colors.success : colors.muted }]}>
                  공개
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  cancelText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  formContent: {
    padding: 16,
    gap: 20,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldInputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  privacyRow: {
    flexDirection: "row",
    gap: 12,
  },
  privacyOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  privacyText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
