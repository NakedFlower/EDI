import {
  Text,
  View,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type HistoryItem = {
  id: number;
  ideaId: number;
  userId: number;
  changeType: "edit" | "ai_session" | "privacy_change" | "created";
  changeSummary: string | null;
  previousData: unknown;
  createdAt: Date;
};

const CHANGE_TYPE_CONFIG = {
  created: { icon: "lightbulb.fill" as const, label: "아이디어 생성" },
  edit: { icon: "pencil" as const, label: "아이디어 수정" },
  ai_session: { icon: "sparkles" as const, label: "AI 코칭" },
  privacy_change: { icon: "globe" as const, label: "공개 설정 변경" },
};

export default function HistoryScreen() {
  const colors = useColors();
  const { ideaId: ideaIdParam } = useLocalSearchParams<{ ideaId: string }>();
  const ideaId = parseInt(ideaIdParam ?? "0", 10);

  const { data: history, isLoading } = trpc.history.get.useQuery(
    { ideaId },
    { enabled: ideaId > 0 }
  );

  const getIconColor = (changeType: string) => {
    switch (changeType) {
      case "created": return colors.success;
      case "edit": return colors.primary;
      case "ai_session": return colors.accent;
      case "privacy_change": return colors.warning;
      default: return colors.muted;
    }
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

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <IconSymbol name="chevron.left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>아이디어 현황</Text>
        <View style={{ width: 24 }} />
      </View>

      {history && history.length > 0 ? (
        <FlatList
          data={history as HistoryItem[]}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const config = CHANGE_TYPE_CONFIG[item.changeType] ?? CHANGE_TYPE_CONFIG.edit;
            const iconColor = getIconColor(item.changeType);
            const isLast = index === (history?.length ?? 0) - 1;

            return (
              <View style={styles.timelineItem}>
                {/* Timeline line */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: iconColor + "20", borderColor: iconColor }]}>
                    <IconSymbol name={config.icon} size={14} color={iconColor} />
                  </View>
                  {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                </View>

                {/* Content */}
                <View style={[styles.timelineContent, { borderColor: colors.border }]}>
                  <Text style={[styles.changeLabel, { color: iconColor }]}>{config.label}</Text>
                  {item.changeSummary ? (
                    <Text style={[styles.changeSummary, { color: colors.foreground }]}>
                      {item.changeSummary}
                    </Text>
                  ) : null}
                  <Text style={[styles.changeDate, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleString("ko-KR")}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="clock.fill" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>아직 히스토리가 없습니다</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            아이디어를 수정하거나 AI 코치와 대화하면 현황 타임라인이 여기에 표시됩니다.
          </Text>
        </View>
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 32,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
    gap: 4,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  changeSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  changeDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});
