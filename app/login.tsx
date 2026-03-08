import { Text, View, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { router } from "expo-router";

export default function LoginScreen() {
  const colors = useColors();

  const handleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await startOAuthLogin();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="lightbulb.fill" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>EDI</Text>
          <Text style={[styles.tagline, { color: colors.accent }]}>Explore, Develop, Improve</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            비즈니스 아이디어를 기록하고{"\n"}AI 멘토와 함께 발전시키세요
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.loginButtonText}>로그인</Text>
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
    justifyContent: "center",
    alignItems: "center",
    gap: 48,
  },
  hero: {
    alignItems: "center",
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginTop: -8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  actions: {
    alignItems: "center",
    gap: 16,
    width: "100%",
    paddingHorizontal: 24,
  },
  loginButton: {
    width: "100%",
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  backText: {
    fontSize: 15,
    marginTop: 4,
  },
});
