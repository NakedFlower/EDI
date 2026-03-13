import { Text, View, Pressable, StyleSheet, Platform, TextInput, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SignupScreen() {
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      if (Platform.OS === "web") {
        alert("모든 필드를 입력해주세요.");
      }
      return;
    }

    if (password !== passwordConfirm) {
      if (Platform.OS === "web") {
        alert("비밀번호가 일치하지 않습니다.");
      }
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === "web") {
        alert("비밀번호는 최소 6자 이상이어야 합니다.");
      }
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      setSubmitting(true);
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name.trim(),
      });

      const idToken = await userCredential.user.getIdToken(true);
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

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("[Signup] Failed:", error);
      let message = "회원가입에 실패했습니다.";
      if (error.code === "auth/email-already-in-use") {
        message = "이미 사용 중인 이메일입니다.";
      } else if (error.code === "auth/invalid-email") {
        message = "유효하지 않은 이메일 형식입니다.";
      } else if (error.code === "auth/weak-password") {
        message = "비밀번호가 너무 약합니다.";
      }
      if (Platform.OS === "web") {
        alert(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>회원가입</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            EDI에 오신 것을 환영합니다
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>이름</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력하세요"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>이메일</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력하세요"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요 (최소 6자)"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>비밀번호 확인</Text>
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 다시 입력하세요"
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
            onPress={handleSignup}
            style={({ pressed }) => [
              styles.signupButton,
              { backgroundColor: colors.primary },
              (pressed || submitting) && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.signupButtonText}>
              {submitting ? "가입 중..." : "회원가입"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.loginLink,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.loginLinkText, { color: colors.muted }]}>
              이미 계정이 있으신가요? <Text style={{ color: colors.primary, fontWeight: "600" }}>로그인</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    gap: 32,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  signupButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
  },
});
