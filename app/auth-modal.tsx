import { Text, View, Pressable, StyleSheet, Platform, TextInput, Modal, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, OAuthProvider } from "firebase/auth";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { IconSymbol } from "@/components/ui/icon-symbol";

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
      if (Platform.OS === "web") {
        alert("이메일과 비밀번호를 입력해주세요.");
      }
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await completeSignIn();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("[Login] Email sign-in failed:", error);
      if (Platform.OS === "web") {
        alert("이메일/비밀번호를 확인해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== "web") {
      if (Platform.OS === "web") {
        alert("Google 로그인을 사용하려면 웹에서 접속해주세요.");
      }
      return;
    }

    try {
      setSubmitting(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuth, provider);
      await completeSignIn();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("[Login] Google sign-in failed:", error);
      if (Platform.OS === "web") {
        alert("Google 로그인에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== "ios") {
      alert("Apple 로그인은 iOS 앱에서만 지원됩니다.");
      return;
    }

    try {
      setSubmitting(true);
      const provider = new OAuthProvider("apple.com");
      await signInWithPopup(firebaseAuth, provider);
      await completeSignIn();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("[Login] Apple sign-in failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.logo, { color: colors.foreground }]}>EDI</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>
                Explore, Develop, Improve your ideas
              </Text>
            </View>

            {/* Email/Password Form */}
            <View style={styles.formSection}>
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
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
              />

              {/* Remember Me */}
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.rememberRow}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  rememberMe && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}>
                  {rememberMe && <IconSymbol name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.rememberText, { color: colors.foreground }]}>로그인 유지</Text>
              </Pressable>

              {/* Login Button */}
              <Pressable
                disabled={submitting}
                onPress={handleEmailLogin}
                style={({ pressed }) => [
                  styles.loginButton,
                  { backgroundColor: colors.foreground },
                  (pressed || submitting) && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.loginButtonText, { color: colors.background }]}>
                  이메일로 로그인
                </Text>
              </Pressable>

              {/* Find Email/Password */}
              <View style={styles.findRow}>
                <Pressable onPress={() => alert("이메일 찾기 기능은 준비 중입니다.")}>
                  <Text style={[styles.findText, { color: colors.muted }]}>이메일 찾기</Text>
                </Pressable>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Pressable onPress={() => alert("비밀번호 찾기 기능은 준비 중입니다.")}>
                  <Text style={[styles.findText, { color: colors.muted }]}>비밀번호 찾기</Text>
                </Pressable>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.dividerSection}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>간편로그인</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* Social Login */}
            <View style={styles.socialSection}>
              <Pressable
                disabled={submitting}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
              </Pressable>

              <Pressable
                disabled={submitting}
                onPress={handleAppleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  { backgroundColor: colors.foreground, borderColor: colors.foreground },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <IconSymbol name="person.fill" size={24} color={colors.background} />
              </Pressable>
            </View>

            {/* Sign Up */}
            <View style={styles.signupSection}>
              <View style={styles.signupRow}>
                <Pressable onPress={() => { onClose(); router.push("/signup" as any); }}>
                  <Text style={[styles.signupLink, { color: colors.foreground }]}>회원가입</Text>
                </Pressable>
                <Text style={[styles.signupText, { color: colors.muted }]}> / </Text>
                <Pressable onPress={() => alert("아이디 찾기 기능은 준비 중입니다.")}>
                  <Text style={[styles.signupLink, { color: colors.foreground }]}>아이디 찾기</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  scrollContent: {
    gap: 24,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  formSection: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: {
    fontSize: 14,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  findRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  findText: {
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: 12,
  },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  socialSection: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  signupSection: {
    alignItems: "center",
  },
  signupRow: {
    flexDirection: "row",
    gap: 8,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
