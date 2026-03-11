import { describe, it, expect } from "vitest";

// Test theme configuration
describe("Theme Configuration", () => {
  it("should export valid theme colors with light and dark variants", async () => {
    const { themeColors } = await import("../theme.config");
    expect(themeColors).toBeDefined();
    expect(themeColors.primary).toBeDefined();
    expect(themeColors.primary.light).toBe("#6C5CE7");
    expect(themeColors.primary.dark).toBe("#A29BFE");
    expect(themeColors.background).toBeDefined();
    expect(themeColors.surface).toBeDefined();
    expect(themeColors.foreground).toBeDefined();
    expect(themeColors.muted).toBeDefined();
    expect(themeColors.border).toBeDefined();
    expect(themeColors.success).toBeDefined();
    expect(themeColors.warning).toBeDefined();
    expect(themeColors.error).toBeDefined();
    expect(themeColors.accent).toBeDefined();
    expect(themeColors.accent.light).toBe("#FF6B35");
  });

  it("should have all required color tokens", async () => {
    const { themeColors } = await import("../theme.config");
    const requiredTokens = [
      "primary", "background", "surface", "foreground",
      "muted", "border", "success", "warning", "error", "accent",
    ];
    for (const token of requiredTokens) {
      expect(themeColors).toHaveProperty(token);
      expect(themeColors[token as keyof typeof themeColors]).toHaveProperty("light");
      expect(themeColors[token as keyof typeof themeColors]).toHaveProperty("dark");
    }
  });
});

// Test icon mappings
describe("Icon Mappings", () => {
  it("should have all required icon mappings", async () => {
    const fs = await import("fs");
    const iconFile = fs.readFileSync("components/ui/icon-symbol.tsx", "utf-8");
    const requiredIcons = [
      "lightbulb.fill", "person.2.fill", "person.fill", "plus",
      "chevron.left", "sparkles", "lock.fill", "globe", "clock.fill",
      "bubble.left.fill", "pencil", "trash.fill", "magnifyingglass",
      "arrow.up.circle.fill", "paperplane.fill", "arrow.right.square.fill",
    ];
    for (const icon of requiredIcons) {
      expect(iconFile).toContain(`"${icon}"`);
    }
  });
});

// Test database schema
describe("Database Schema", () => {
  it("should export all required tables and types", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.users).toBeDefined();
    expect(schema.ideas).toBeDefined();
    expect(schema.conversations).toBeDefined();
    expect(schema.messages).toBeDefined();
    expect(schema.comments).toBeDefined();
    expect(schema.ideaHistory).toBeDefined();
  });
});

// Test Korean localization in UI
describe("Korean Localization - UI", () => {
  it("should have Korean tab titles", async () => {
    const fs = await import("fs");
    const tabLayout = fs.readFileSync("app/(tabs)/_layout.tsx", "utf-8");
    expect(tabLayout).toContain('"창고"');
    expect(tabLayout).toContain('"커뮤니티"');
    expect(tabLayout).toContain('"프로필"');
  });

  it("should have Korean text on home screen", async () => {
    const fs = await import("fs");
    const homeScreen = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
    expect(homeScreen).toContain("내 창고");
    expect(homeScreen).toContain("아이디어 검색...");
    expect(homeScreen).toContain("EDI에 오신 것을 환영합니다");
    expect(homeScreen).toContain("로그인");
    expect(homeScreen).toContain("아이디어 삭제");
  });

  it("should have Korean text on new idea screen", async () => {
    const fs = await import("fs");
    const newIdea = fs.readFileSync("app/new-idea.tsx", "utf-8");
    expect(newIdea).toContain("새 아이디어");
    expect(newIdea).toContain("취소");
    expect(newIdea).toContain("저장");
    expect(newIdea).toContain("비공개");
    expect(newIdea).toContain("공개");
    expect(newIdea).toContain("공개 설정");
  });

  it("should have Korean text on idea detail screen", async () => {
    const fs = await import("fs");
    const ideaDetail = fs.readFileSync("app/idea/[id].tsx", "utf-8");
    expect(ideaDetail).toContain("AI 멘토와 대화");
    expect(ideaDetail).toContain("아이디어 현황");
    expect(ideaDetail).toContain("댓글 보기");
    expect(ideaDetail).toContain("비공개");
    expect(ideaDetail).toContain("공개");
    expect(ideaDetail).toContain("생성일");
    expect(ideaDetail).toContain("수정일");
  });

  it("should have Korean text on community screen", async () => {
    const fs = await import("fs");
    const community = fs.readFileSync("app/(tabs)/community.tsx", "utf-8");
    expect(community).toContain("커뮤니티");
    expect(community).toContain("공개된 아이디어를 탐색하고 토론하세요");
    expect(community).toContain("익명");
  });

  it("should have Korean text on profile screen", async () => {
    const fs = await import("fs");
    const profile = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
    expect(profile).toContain("프로필");
    expect(profile).toContain("전체 아이디어");
    expect(profile).toContain("로그아웃");
  });

  it("should have Korean text on coach screen", async () => {
    const fs = await import("fs");
    const coach = fs.readFileSync("app/coach/[ideaId].tsx", "utf-8");
    expect(coach).toContain("AI 멘토");
    expect(coach).toContain("대화를 시작하세요");
    expect(coach).toContain("멘토에게 아이디어를 설명해보세요...");
    expect(coach).toContain("생각 중...");
  });

  it("should have Korean text on discussion screen", async () => {
    const fs = await import("fs");
    const discussion = fs.readFileSync("app/discussion/[ideaId].tsx", "utf-8");
    expect(discussion).toContain("토론");
    expect(discussion).toContain("의견을 남겨보세요...");
    expect(discussion).toContain("아직 댓글이 없습니다");
  });

  it("should have Korean text on history screen", async () => {
    const fs = await import("fs");
    const history = fs.readFileSync("app/history/[ideaId].tsx", "utf-8");
    expect(history).toContain("아이디어 현황");
    expect(history).toContain("아이디어 생성");
    expect(history).toContain("아이디어 수정");
    expect(history).toContain("AI 코칭");
    expect(history).toContain("공개 설정 변경");
  });

  it("should have Korean text on login screen", async () => {
    const fs = await import("fs");
    const login = fs.readFileSync("app/login.tsx", "utf-8");
    expect(login).toContain("로그인 방식 선택");
    expect(login).toContain("Google로 로그인");
    expect(login).toContain("Naver로 로그인");
    expect(login).toContain("Kakao로 로그인");
    expect(login).toContain("일반 로그인");
    expect(login).toContain("돌아가기");
  });
});

// Test Korean localization in server
describe("Korean Localization - Server", () => {
  it("should have Korean AI coach system prompt", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain("당신은 경험 많은 스타트업 멘토입니다");
    expect(routerFile).toContain("반드시 한국어로 대답하세요");
  });

  it("should have Korean history summaries", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain("아이디어 생성");
    expect(routerFile).toContain("수정됨:");
    expect(routerFile).toContain("공개로 변경");
    expect(routerFile).toContain("비공개로 변경");
    expect(routerFile).toContain("AI 멘토링 대화 진행");
  });

  it("should have Korean anonymous fallback", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain('author?.name ?? "익명"');
  });

  it("should have Korean idea context labels", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain("제목: ${idea.title}");
    expect(routerFile).toContain("설명: ${idea.description}");
    expect(routerFile).toContain("문제점: ${idea.problem}");
  });
});

// Test bug fix - isPublic state on edit
describe("Bug Fix - isPublic State on Edit", () => {
  it("should initialize editIsPublic from idea.isPublic", async () => {
    const fs = await import("fs");
    const ideaDetail = fs.readFileSync("app/idea/[id].tsx", "utf-8");
    expect(ideaDetail).toContain("setEditIsPublic(idea.isPublic)");
    expect(ideaDetail).toContain("isPublic: editIsPublic");
  });

  it("should show privacy toggle in edit mode", async () => {
    const fs = await import("fs");
    const ideaDetail = fs.readFileSync("app/idea/[id].tsx", "utf-8");
    expect(ideaDetail).toContain("privacyRow");
    expect(ideaDetail).toContain("setEditIsPublic(false)");
    expect(ideaDetail).toContain("setEditIsPublic(true)");
  });
});

// Test comment notification badge
describe("Comment Notification Badge", () => {
  it("should query commentCounts on home screen", async () => {
    const fs = await import("fs");
    const homeScreen = fs.readFileSync("app/(tabs)/index.tsx", "utf-8");
    expect(homeScreen).toContain("trpc.ideas.commentCounts.useQuery");
    expect(homeScreen).toContain("commentBadge");
  });

  it("should have commentCounts endpoint in router", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain("commentCounts:");
    expect(routerFile).toContain("getUserIdeaCommentCounts");
  });

  it("should have getUserIdeaCommentCounts in db helpers", async () => {
    const fs = await import("fs");
    const dbFile = fs.readFileSync("server/db.ts", "utf-8");
    expect(dbFile).toContain("export async function getUserIdeaCommentCounts");
  });
});

// Test Profile Sign Out UX
describe("Profile Sign Out UX", () => {
  it("should have logout icon in header", async () => {
    const fs = await import("fs");
    const profile = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
    expect(profile).toContain("logoutIconBtn");
    expect(profile).toContain("arrow.right.square.fill");
    expect(profile).toContain("headerBar");
  });

  it("should show confirmation dialog before logout", async () => {
    const fs = await import("fs");
    const profile = fs.readFileSync("app/(tabs)/profile.tsx", "utf-8");
    expect(profile).toContain("Alert.alert");
    expect(profile).toContain("정말 로그아웃 하시겠습니까?");
  });
});

// Test router structure
describe("Server Routers", () => {
  it("should have all required router procedures", async () => {
    const fs = await import("fs");
    const routerFile = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routerFile).toContain("ideas: router({");
    expect(routerFile).toContain("community: router({");
    expect(routerFile).toContain("coach: router({");
    expect(routerFile).toContain("history: router({");
    expect(routerFile).toContain("list: protectedProcedure");
    expect(routerFile).toContain("create: protectedProcedure");
    expect(routerFile).toContain("update: protectedProcedure");
    expect(routerFile).toContain("delete: protectedProcedure");
    expect(routerFile).toContain("commentCounts: protectedProcedure");
  });
});

// Test app configuration
describe("App Configuration", () => {
  it("should have correct app name and branding", async () => {
    const fs = await import("fs");
    const configFile = fs.readFileSync("app.config.ts", "utf-8");
    expect(configFile).toContain('appName: "EDI"');
    expect(configFile).toContain('appSlug: "ideavault"');
    expect(configFile).toContain("logoUrl:");
  });
});

// Test screen files exist
describe("Screen Files", () => {
  it("should have all required screen files", async () => {
    const fs = await import("fs");
    const screens = [
      "app/(tabs)/index.tsx",
      "app/(tabs)/community.tsx",
      "app/(tabs)/profile.tsx",
      "app/new-idea.tsx",
      "app/idea/[id].tsx",
      "app/coach/[ideaId].tsx",
      "app/discussion/[ideaId].tsx",
      "app/history/[ideaId].tsx",
      "app/login.tsx",
    ];
    for (const screen of screens) {
      expect(fs.existsSync(screen)).toBe(true);
    }
  });
});

// Test DB helper functions
describe("Database Helpers", () => {
  it("should export all required query functions", async () => {
    const fs = await import("fs");
    const dbFile = fs.readFileSync("server/db.ts", "utf-8");
    const requiredFunctions = [
      "getUserIdeas", "getIdeaById", "createIdea", "updateIdea",
      "deleteIdea", "getPublicIdeas", "getOrCreateConversation",
      "getConversationMessages", "addMessage", "getIdeaComments",
      "addComment", "getIdeaHistory", "addIdeaHistory", "getUserById",
      "getUserIdeaCommentCounts",
    ];
    for (const fn of requiredFunctions) {
      expect(dbFile).toContain(`export async function ${fn}`);
    }
  });
});
