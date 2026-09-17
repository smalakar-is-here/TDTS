import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { ThemeProvider, useTheme } from "@figma/astraui";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import { isMockMode } from "./lib/api";
import { AppShell, ROLE_HOME, canRoleAccess, getRoleFromScreen, type Role, type ScreenId } from "./components/task-dashboard/AppShell";
import { CommandPalette } from "./components/task-dashboard/CommandPalette";
import { OnboardingTour } from "./components/task-dashboard/OnboardingTour";
import { LoadingScreen } from "./components/task-dashboard/screens/LoadingScreen";
import { LandingScreen } from "./components/task-dashboard/screens/LandingScreen";
import { PricingScreen } from "./components/task-dashboard/screens/PricingScreen";
import { LoginScreen } from "./components/task-dashboard/screens/LoginScreen";
import { ForgotPasswordScreen, ResetPasswordScreen, SignUpScreen, SsoRedirectScreen } from "./components/task-dashboard/screens/AuthScreens";
import { DashboardScreen } from "./components/task-dashboard/screens/DashboardScreen";
import { TaskManagementScreen } from "./components/task-dashboard/screens/TaskManagementScreen";
import { LeaderboardScreen } from "./components/task-dashboard/screens/LeaderboardScreen";
import { SettingsScreen } from "./components/task-dashboard/screens/SettingsScreen";
import { SuperAdminScreen } from "./components/task-dashboard/screens/SuperAdminScreen";
import { ManageAdminsScreen } from "./components/task-dashboard/screens/ManageAdminsScreen";
import { GlobalLeaderboardScreen } from "./components/task-dashboard/screens/GlobalLeaderboardScreen";
import { RoleSettingsScreen } from "./components/task-dashboard/screens/RoleSettingsScreen";
import { EmployeeScreen } from "./components/task-dashboard/screens/EmployeeScreen";
import { FilesScreen } from "./components/task-dashboard/screens/FilesScreen";
import { RewardsScreen } from "./components/task-dashboard/screens/RewardsScreen";
import { EmployeeSettingsScreen } from "./components/task-dashboard/screens/EmployeeSettingsScreen";
import { ProfileScreen } from "./components/task-dashboard/screens/ProfileScreen";
import { NotFoundScreen } from "./components/task-dashboard/screens/NotFoundScreen";
import { AccessDeniedScreen } from "./components/task-dashboard/screens/AccessDeniedScreen";
import { WorkspaceProvider } from "./components/task-dashboard/WorkspaceContext";

const CreateTaskScreen = lazy(() => import("./components/task-dashboard/screens/CreateTaskScreen").then((module) => ({ default: module.CreateTaskScreen })));
const DelegateTaskScreen = lazy(() => import("./components/task-dashboard/screens/DelegateTaskScreen").then((module) => ({ default: module.DelegateTaskScreen })));
const AllProjectsScreen = lazy(() => import("./components/task-dashboard/screens/AllProjectsScreen").then((module) => ({ default: module.AllProjectsScreen })));
const ExportCsvScreen = lazy(() => import("./components/task-dashboard/screens/ExportCsvScreen").then((module) => ({ default: module.ExportCsvScreen })));
const MyPerformanceScreen = lazy(() => import("./components/task-dashboard/screens/MyPerformanceScreen").then((module) => ({ default: module.MyPerformanceScreen })));

export type AppState = "loading" | "landing" | "pricing" | "login" | "signup" | "forgot" | "reset" | "sso" | "app";
type StoredSession = { role: Role; screen: ScreenId; token?: string | null };

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("tdts-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed.role !== "admin" && parsed.role !== "super" && parsed.role !== "employee") return null;
    if (typeof parsed.screen !== "string") return null;
    const token = window.localStorage.getItem("tdts-token");
    if (!isMockMode() && !token) return null;
    const screen = parsed.screen as ScreenId;
    return { role: parsed.role, screen: canRoleAccess(parsed.role, screen) ? screen : ROLE_HOME[parsed.role], token };
  } catch {
    window.localStorage.removeItem("tdts-session");
    return null;
  }
}

function ScreenFallback() {
  return <div className="grid min-h-[320px] place-items-center"><div className="text-center"><span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /><p className="mt-3 text-sm text-muted-foreground">Loading workspace…</p></div></div>;
}

function AppRuntime() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { token, logout } = useAuth();
  const [bootSession] = useState<StoredSession | null>(() => readSession());
  const [appState, setAppState] = useState<AppState>(() => bootSession ? "app" : "loading");
  const [role, setRole] = useState<Role>(() => bootSession?.role ?? "admin");
  const [screen, setScreen] = useState<ScreenId>(() => bootSession?.screen ?? "dashboard");
  const [showTour, setShowTour] = useState(false);
  const [requiredRole, setRequiredRole] = useState<Role | undefined>();
  const [themeInitialized, setThemeInitialized] = useState(false);

  useEffect(() => { const saved = window.localStorage.getItem("tdts-theme"); if (saved === "light" || saved === "dark") setTheme(saved); setThemeInitialized(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!themeInitialized) return; if (theme === "light" || theme === "dark") window.localStorage.setItem("tdts-theme", theme); }, [theme, themeInitialized]);
  useEffect(() => { if (appState === "app") window.localStorage.setItem("tdts-session", JSON.stringify({ role, screen, token } satisfies StoredSession)); }, [appState, role, screen, token]);
  useEffect(() => { if (!isMockMode() && appState === "app" && !token) { window.localStorage.removeItem("tdts-session"); setAppState("landing"); } }, [appState, token]);

  const enterApp = useCallback((nextRole: Role, tour = false) => { setRole(nextRole); setScreen(ROLE_HOME[nextRole]); setRequiredRole(undefined); setAppState("app"); setShowTour(tour); }, []);
  const navigate = useCallback((id: ScreenId) => { if (!canRoleAccess(role, id)) { setRequiredRole(getRoleFromScreen(id)); setScreen("access-denied"); return; } setRequiredRole(undefined); setScreen(id); }, [role]);
  const signOut = useCallback(() => { void logout(); window.localStorage.removeItem("tdts-session"); setShowTour(false); setRequiredRole(undefined); setAppState("landing"); }, [logout]);

  function renderScreen() {
    switch (screen) {
      case "dashboard": return <DashboardScreen onNavigate={navigate} />;
      case "tasks": return <TaskManagementScreen onNavigate={navigate} />;
      case "create-task": return <CreateTaskScreen onNavigate={navigate} />;
      case "delegate-task": return <DelegateTaskScreen onNavigate={navigate} />;
      case "leaderboard": return <LeaderboardScreen onNavigate={navigate} />;
      case "settings": return <SettingsScreen onNavigate={navigate} />;
      case "superadmin": return <SuperAdminScreen onNavigate={navigate} />;
      case "sa-projects": return <AllProjectsScreen onNavigate={navigate} />;
      case "sa-export": return <ExportCsvScreen onNavigate={navigate} />;
      case "sa-admins": return <ManageAdminsScreen onNavigate={navigate} />;
      case "sa-leaderboard": return <GlobalLeaderboardScreen onNavigate={navigate} />;
      case "sa-settings": return <RoleSettingsScreen onNavigate={navigate} />;
      case "employee": return <EmployeeScreen onNavigate={navigate} />;
      case "emp-files": return <FilesScreen onNavigate={navigate} />;
      case "emp-performance": return <MyPerformanceScreen onNavigate={navigate} />;
      case "emp-rewards": return <RewardsScreen onNavigate={navigate} />;
      case "emp-settings": return <EmployeeSettingsScreen onNavigate={navigate} />;
      case "profile": return <ProfileScreen role={role} onNavigate={navigate} />;
      case "access-denied": return <AccessDeniedScreen role={role} requiredRole={requiredRole} onNavigate={navigate} />;
      case "not-found": return <NotFoundScreen onNavigate={navigate} />;
      default: return <NotFoundScreen onNavigate={navigate} />;
    }
  }

  let content: ReactNode;
  switch (appState) {
    case "loading": content = <LoadingScreen onComplete={() => setAppState("landing")} />; break;
    case "landing": content = <LandingScreen onGetStarted={() => setAppState("signup")} onLogin={() => setAppState("login")} onPricing={() => setAppState("pricing")} />; break;
    case "pricing": content = <PricingScreen onBack={() => setAppState("landing")} onGetStarted={() => setAppState("signup")} />; break;
    case "login": content = <LoginScreen onLogin={(nextRole) => enterApp(nextRole)} onSignUp={() => setAppState("signup")} onForgot={() => setAppState("forgot")} onSso={() => setAppState("sso")} onBack={() => setAppState("landing")} />; break;
    case "signup": content = <SignUpScreen onComplete={(nextRole) => enterApp(nextRole, true)} onBack={() => setAppState("landing")} />; break;
    case "forgot": content = <ForgotPasswordScreen onBack={() => setAppState("login")} onReset={() => setAppState("reset")} />; break;
    case "reset": content = <ResetPasswordScreen onBack={() => setAppState("forgot")} onDone={() => setAppState("login")} />; break;
    case "sso": content = <SsoRedirectScreen onBack={() => setAppState("login")} onComplete={() => enterApp("admin")} />; break;
    case "app": content = <AppShell active={screen} role={role} onNavigate={navigate} onSignOut={signOut}>{renderScreen()}</AppShell>; break;
  }

  return <><Suspense fallback={<ScreenFallback />}>{content}</Suspense><CommandPalette authenticated={appState === "app"} onNavigate={navigate} onToggleTheme={toggleTheme} onSignOut={signOut} /><Toaster position="bottom-right" richColors closeButton /><OnboardingTour open={showTour} onFinish={() => setShowTour(false)} /></>;
}

export default function App() {
  return <ThemeProvider><DndProvider backend={HTML5Backend}><AuthProvider><WorkspaceProvider><AppRuntime /></WorkspaceProvider></AuthProvider></DndProvider></ThemeProvider>;
}