import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const utils = trpc.useUtils();

  const { data: ideas } = trpc.ideas.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const totalIdeas = ideas?.length ?? 0;
  const publicIdeas = ideas?.filter((i) => i.isPublic).length ?? 0;

  const handleLogout = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "로그아웃",
      "정말 로그아웃 하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "로그아웃",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              utils.invalidate();
              if (Platform.OS === "web") {
                window.location.reload();
              }
            } catch (err) {
              console.error("[Profile] Logout error:", err);
              if (Platform.OS === "web") {
                window.location.reload();
              }
            }
          },
        },
      ]
    );
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

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View style={styles.centered}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="person.fill" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>프로필</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            로그인하여 프로필과 설정에 접근하세요
          </Text>
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => [
              styles.signInButton,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <Text style={styles.signInButtonText}>로그인</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-0">
      {/* Header - logout icon top-right only */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerBarTitle, { color: colors.foreground }]}>프로필</Text>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutIconBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <IconSymbol name="arrow.right.square.fill" size={24} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.name ?? "사용자"}
          </Text>
          {user?.email ? (
            <Text style={[styles.userEmail, { color: colors.muted }]}>{user.email}</Text>
          ) : null}
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{totalIdeas}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>전체 아이디어</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{publicIdeas}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>공개</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.accent }]}>{totalIdeas - publicIdeas}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>비공개</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>정보</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
                <Text style={[styles.settingText, { color: colors.foreground }]}>버전</Text>
              </View>
              <Text style={[styles.settingValue, { color: colors.muted }]}>1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerBarTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  logoutIconBtn: {
    padding: 4,
  },
  content: {
    paddingBottom: 48,
  },
  userSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: "80%",
    alignSelf: "center",
  },
  settingsSection: {
    marginTop: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 15,
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
