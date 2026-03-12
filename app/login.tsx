import { Text, View, Pressable, StyleSheet, Platform, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";

export default function LoginScreen() {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const completeSignIn = async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("Firebase user is missing");
    }

    const idToken = await currentUser.getIdToken(true);
    await Auth.setSessionToken(idToken);
    if (Platform.OS === "web") {
      await Api.establishSession(idToken);
    }
    const me = await Api.getMe();
    if (me) {
      await Auth.setUserInfo({
        id: me.id,
        openId: me.openId,
        name: me.name,
        email: me.email,
        loginMethod: me.loginMethod,
        lastSignedIn: new Date(me.lastSignedIn),
      });
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("로그인 실패", "이메일과 비밀번호를 입력해주세요.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await completeSignIn();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("[Login] Email sign-in failed:", error);
      Alert.alert("로그인 실패", "이메일/비밀번호를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("안내", "Google 로그인을 사용하려면 웹에서 접속해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      await completeSignIn();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("[Login] Google sign-in failed:", error);
      Alert.alert("로그인 실패", "Google 로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
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
          <View style={styles.formGroup}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          <Pressable
            disabled={submitting}
            onPress={handleEmailLogin}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              (pressed || submitting) && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>이메일/비밀번호 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>Firebase Authentication 사용</Text>
            </View>
          </Pressable>

          <Pressable
            disabled={submitting}
            onPress={handleGoogleLogin}
            style={({ pressed }) => [
              styles.methodButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              (pressed || submitting) && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <View style={styles.methodContent}>
              <Text style={[styles.methodTitle, { color: colors.foreground }]}>Google 로그인</Text>
              <Text style={[styles.methodCaption, { color: colors.muted }]}>웹에서만 지원됩니다</Text>
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
  formGroup: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
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
