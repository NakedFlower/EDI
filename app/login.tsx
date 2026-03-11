import { Text, View, Pressable, StyleSheet, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin, type LoginMethod } from "@/constants/oauth";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();

  const handleLogin = async (method: LoginMethod) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await startOAuthLogin(method);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>로그인 방식 선택</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            원하는 로그인 방법을 선택해 계속 진행하세요
          </Text>
        </View>

        <View style={styles.methodList}>
          <Pressable
            onPress={() => handleLogin("google")}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>Google로 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>구글 계정으로 빠르게 시작</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleLogin("naver")}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>Naver로 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>네이버 계정으로 로그인</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleLogin("kakao")}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>Kakao로 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>카카오 계정으로 로그인</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleLogin("email")}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>일반 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>이메일/비밀번호로 로그인</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.backText, { color: colors.muted }]}>돌아가기</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 36,
    gap: 24,
  },
  header: {
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  methodList: {
    gap: 12,
    width: "100%",
  },
  methodButton: {
    width: "100%",
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  methodContent: {
    gap: 2,
  },
  methodTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  methodCaption: {
    fontSize: 13,
  },
  backText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
});
