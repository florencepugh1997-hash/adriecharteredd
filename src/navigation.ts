export type AppView =
  | "landing"
  | "onboarding"
  | "login"
  | "signup"
  | "verify-method"
  | "verify"
  | "dashboard"
  | "admin"
  | "terms"
  | "privacy";

export type DashboardTab = "home" | "send" | "history" | "profile";

const VIEW_TO_PATH: Record<AppView, string> = {
  landing: "/",
  onboarding: "/onboarding",
  login: "/login",
  signup: "/signup",
  "verify-method": "/verify-method",
  verify: "/verify",
  dashboard: "/dashboard",
  admin: "/admin",
  terms: "/terms",
  privacy: "/privacy",
};

const DASHBOARD_TAB_TO_SEGMENT: Record<DashboardTab, string> = {
  home: "",
  send: "/transfers",
  history: "/history",
  profile: "/profile",
};

const SEGMENT_TO_DASHBOARD_TAB: Record<string, DashboardTab> = {
  transfers: "send",
  history: "history",
  profile: "profile",
};

export function viewToPath(view: AppView, dashboardTab: DashboardTab = "home"): string {
  if (view === "dashboard") {
    return `/dashboard${DASHBOARD_TAB_TO_SEGMENT[dashboardTab]}`;
  }
  return VIEW_TO_PATH[view] ?? "/";
}

export function pathToView(pathname: string): { view: AppView; dashboardTab: DashboardTab } {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const segment = path.slice("/dashboard".length).replace(/^\//, "");
    const dashboardTab = segment ? (SEGMENT_TO_DASHBOARD_TAB[segment] ?? "home") : "home";
    return { view: "dashboard", dashboardTab };
  }

  const entry = Object.entries(VIEW_TO_PATH).find(([, p]) => p === path);
  if (entry) {
    return { view: entry[0] as AppView, dashboardTab: "home" };
  }

  return { view: "landing", dashboardTab: "home" };
}

export function isPublicView(view: AppView): boolean {
  return ["landing", "onboarding", "login", "signup", "verify-method", "verify", "admin", "terms", "privacy"].includes(view);
}

export function isAuthEntryView(view: AppView): boolean {
  return ["landing", "login", "signup"].includes(view);
}
