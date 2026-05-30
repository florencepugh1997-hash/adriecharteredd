import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, CurrencyCode, OtpMethod } from "../types.js";
import { ToastMessage, ToastType } from "../components/Toast.js";
import {
  AppView,
  DashboardTab,
  pathToView,
  viewToPath,
  isAuthEntryView,
} from "../navigation.js";

const API_TIMEOUT_MS = 25_000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. The email server may be slow — try SMS or WhatsApp instead.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AppNotification {
  id: string;
  type: "failed" | "success" | "info" | "warning";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  tempUserId: string | null;
  currentView: string;
  dashboardTab: DashboardTab;
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (type: ToastType, text: string) => void;
  removeToast: (id: string) => void;
  setView: (view: string, options?: { replace?: boolean; tab?: DashboardTab }) => void;
  setDashboardTab: (tab: DashboardTab) => void;
  setTempUserId: (userId: string | null) => void;
  login: (email: string, pass: string) => Promise<{ needOtp: boolean; userId?: string }>;
  signup: (payload: any) => Promise<any>;
  sendOtp: (userId: string, method: OtpMethod) => Promise<{ otpCodeHint?: string }>;
  verifyOtp: (userId: string, code: string) => Promise<any>;
  resendOtp: (userId: string) => Promise<{ otpCodeHint?: string }>;
  logout: () => void;
  updateCurrency: (currency: CurrencyCode) => Promise<void>;
  updateProfilePhoto: (profilePhoto: string | null) => Promise<void>;
  fundAccount: (
    amount: number,
    description?: string,
    extra?: {
      senderName?: string;
      senderBank?: string;
      senderAccount?: string;
      paymentMethod?: string;
    }
  ) => Promise<void>;
  transferFunds: (payload: {
    recipientAccount: string;
    recipientSortCode: string;
    recipientBank: string;
    recipientName: string;
    amount: number;
    description?: string;
  }) => Promise<{ reference: string; alertMessage: string }>;
  refreshUserData: () => Promise<void>;
  notifications: AppNotification[];
  addNotification: (type: "failed" | "success" | "info" | "warning", title: string, message: string) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Could not reach the banking server. If you are on mobile, use the full site URL (adriechartered.onrender.com) and try again."
    );
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initialRoute = pathToView(window.location.pathname);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("adrie_token"));
  const [tempUserId, setTempUserIdState] = useState<string | null>(localStorage.getItem("adrie_temp_user_id"));
  const [currentView, setCurrentView] = useState<string>(() => {
    const storedToken = localStorage.getItem("adrie_token");
    if (storedToken && isAuthEntryView(initialRoute.view)) return "dashboard";
    return initialRoute.view;
  });
  const [dashboardTab, setDashboardTabState] = useState<DashboardTab>(initialRoute.dashboardTab);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isPopNavigation = useRef(false);

  const applyRoute = useCallback((view: AppView, tab: DashboardTab = "home") => {
    setCurrentView(view);
    setDashboardTabState(tab);
  }, []);

  const setView = useCallback(
    (view: string, options?: { replace?: boolean; tab?: DashboardTab }) => {
      const nextView = view as AppView;
      const nextTab = options?.tab ?? (nextView === "dashboard" ? dashboardTab : "home");
      const path = viewToPath(nextView, nextTab);

      applyRoute(nextView, nextTab);

      if (isPopNavigation.current) {
        isPopNavigation.current = false;
        return;
      }

      if (options?.replace) {
        window.history.replaceState({ view: nextView, tab: nextTab }, "", path);
      } else if (window.location.pathname !== path) {
        window.history.pushState({ view: nextView, tab: nextTab }, "", path);
      }
    },
    [applyRoute, dashboardTab]
  );

  const setDashboardTab = useCallback(
    (tab: DashboardTab) => {
      if (currentView !== "dashboard") return;
      const path = viewToPath("dashboard", tab);
      setDashboardTabState(tab);

      if (isPopNavigation.current) {
        isPopNavigation.current = false;
        return;
      }

      if (window.location.pathname !== path) {
        window.history.pushState({ view: "dashboard", tab }, "", path);
      }
    },
    [currentView]
  );

  useEffect(() => {
    const onPopState = () => {
      isPopNavigation.current = true;
      const { view, dashboardTab: tab } = pathToView(window.location.pathname);
      applyRoute(view, tab);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyRoute]);

  useEffect(() => {
    const path = viewToPath(currentView as AppView, dashboardTab);
    window.history.replaceState({ view: currentView, tab: dashboardTab }, "", path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const activeToken = token ?? localStorage.getItem("adrie_token");
    if (currentView === "dashboard" && !activeToken) {
      setView("login", { replace: true });
      return;
    }
    const activeTempId = tempUserId ?? localStorage.getItem("adrie_temp_user_id");
    if ((currentView === "verify" || currentView === "verify-method") && !activeTempId) {
      setView("login", { replace: true });
    }
  }, [currentView, token, tempUserId, setView]);

  // Show dynamic banner/toast helper
  const showToast = (type: ToastType, text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    // Auto-remove after 6 seconds
    setTimeout(() => removeToast(id), 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "initial-alert",
      type: "info",
      title: "Security Shield Active",
      message: "AdrieChartered global digital portal secured. IMF cleared nodes configured on default profiles.",
      timestamp: new Date().toISOString(),
      read: false
    }
  ]);

  const addNotification = (type: "failed" | "success" | "info" | "warning", title: string, message: string) => {
    setNotifications((prev) => [
      {
        id: Math.random().toString(),
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const setTempUserId = (userId: string | null) => {
    setTempUserIdState(userId);
    if (userId) {
      localStorage.setItem("adrie_temp_user_id", userId);
    } else {
      localStorage.removeItem("adrie_temp_user_id");
    }
  };

  // Sync token context with local storage
  const updateToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem("adrie_token", newToken);
    } else {
      localStorage.removeItem("adrie_token");
    }
  };

  // Authenticate and reload session upon startup
  const refreshUserData = async () => {
    const activeToken = localStorage.getItem("adrie_token");
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/user/me", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setUser(data.user);
        if (currentView === "login" || currentView === "signup" || currentView === "landing") {
          setView("dashboard", { replace: true });
        }
      } else {
        // Clear corrupt token
        updateToken(null);
        setUser(null);
        if (res.status === 403) {
          const data = await parseJsonResponse(res).catch(() => ({}));
          if (data.code === "ACCOUNT_BLOCKED") {
            setView("login", { replace: true });
            return;
          }
        }
        setView("login", { replace: true });
      }
    } catch (err) {
      console.error("Session refresh error:", err);
      showToast("error", "Network connection issues syncing profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    refreshUserData();
  }, [token]);

  // Auth flow endpoints
  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: pass }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        const err: any = new Error(data.error || "Login credentials rejected.");
        err.code = data.code;
        throw err;
      }

      showToast("success", "Credentials approved. Directing to verification...");
      setTempUserId(data.userId);
      setView("verify-method");
      return { needOtp: true, userId: data.userId };
    } catch (error: any) {
      if (error.code !== "ACCOUNT_BLOCKED") {
        showToast("error", error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const rawText = await res.text();
      let data;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(
          "Could not reach the banking server. Use adriechartered.onrender.com and try again."
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Could not register user.");
      }

      if (data.status === "pending" || data.status === "resume") {
        const toastText =
          data.status === "resume"
            ? "Resuming your registration — verify your email next."
            : "Application Registered — verify your email next.";
        showToast("success", toastText);
        return { isPendingApproval: true, pendingId: data.pendingId, email: data.email, message: data.message };
      }

      showToast("success", `Account Registered! Account Number ${data.accountNumber} sent to your email ${payload.email}.`);
      setTempUserId(data.userId);
      setView("verify-method");
      return { userId: data.userId, accountNumber: data.accountNumber };
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (userId: string, method: OtpMethod) => {
    setIsLoading(true);
    try {
      const res = await fetchWithTimeout("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, method }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "OTP delivery failed.");
      }

      if (data.deliveryFailed || data.delivered === false) {
        throw new Error(data.error || "Verification code could not be delivered.");
      }

      showToast("success", `Security code sent to your ${method}. Check your inbox and spam folder.`);

      setView("verify");
      return {};
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (userId: string, code: string): Promise<any> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: code.trim() }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Incorrect or expired verification code.");
      }

      if (data.isPending) {
        showToast("success", "Security code verified! Application queued for Superintendent review.");
        setTempUserId(null);
        return { isPending: true };
      }

      showToast("success", "Security confirmation successful! Logging in...");
      setUser(data.user);
      updateToken(data.token);
      setTempUserId(null);
      setView("dashboard", { replace: true });
      return { isPending: false };
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await fetchWithTimeout("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Could not resend transaction code.");
      }

      if (data.deliveryFailed || data.delivered === false) {
        throw new Error(data.error || "Verification code could not be re-sent.");
      }

      showToast("success", `Security code re-sent. Check your inbox and spam folder.`);

      return {};
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    updateToken(null);
    setTempUserId(null);
    setUser(null);
    setView("landing", { replace: true });
    showToast("info", "You have been signed out securely.");
  };

  // Profile / Transactions actions
  const updateCurrency = async (currency: CurrencyCode) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/currency", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Could not change currency code.");
      }

      setUser((prev) => (prev ? { ...prev, currency: data.user.currency } : null));
      showToast("success", `Preselected display currency set to ${currency}.`);
    } catch (error: any) {
      showToast("error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfilePhoto = async (profilePhoto: string | null) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile-photo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePhoto: profilePhoto ?? "" }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "Could not update profile photo.");
      setUser(data.user);
      showToast("success", data.message || "Profile photo updated.");
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fundAccount = async (
    amount: number,
    description?: string,
    extra?: {
      senderName?: string;
      senderBank?: string;
      senderAccount?: string;
      paymentMethod?: string;
    }
  ) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/transactions/fund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          description,
          senderName: extra?.senderName,
          senderBank: extra?.senderBank,
          senderAccount: extra?.senderAccount,
          paymentMethod: extra?.paymentMethod,
        }),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "Manual deposit request failed.");
      }

      setUser((prev) => (prev ? { ...prev, balance: data.balance } : null));
      showToast("success", `Funds added securely. Balance updated!`);
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const transferFunds = async (payload: {
    recipientAccount: string;
    recipientSortCode: string;
    recipientBank: string;
    recipientName: string;
    amount: number;
    description?: string;
  }) => {
    if (!token) throw new Error("Authentication missing.");
    setIsLoading(true);
    try {
      const res = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);

      if (!res.ok) {
        throw new Error(data.error || "FPS electronic transfer failed.");
      }

      setUser((prev) => (prev ? { ...prev, balance: data.balance } : null));
      showToast("success", "Debit transaction approved and cleared!");
      return { reference: data.transaction.reference, alertMessage: data.alertMessage };
    } catch (error: any) {
      showToast("error", error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        tempUserId,
        currentView,
        dashboardTab,
        isLoading,
        toasts,
        showToast,
        removeToast,
        setView,
        setDashboardTab,
        setTempUserId,
        login,
        signup,
        sendOtp,
        verifyOtp,
        resendOtp,
        logout,
        updateCurrency,
        updateProfilePhoto,
        fundAccount,
        transferFunds,
        refreshUserData,
        notifications,
        addNotification,
        markNotificationRead,
        clearAllNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used inside an AppProvider wrapper");
  }
  return context;
}
