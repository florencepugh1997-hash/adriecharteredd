import { useApp, AppProvider } from "./context/AppContext";
import LandingView from "./components/LandingView";
import OnboardingView from "./components/OnboardingView";
import LoginView from "./components/LoginView";
import SignupView from "./components/SignupView";
import AdminView from "./components/AdminView";
import VerifyMethodView from "./components/VerifyMethodView";
import VerifyOtpView from "./components/VerifyOtpView";
import DashboardView from "./components/DashboardView";
import Toast from "./components/Toast";

function AdrieBankingPortal() {
  const { currentView, toasts, removeToast } = useApp();

  // Authentication screens wrapper layout (centered card views)
  const isCenteredCardView = ["login", "signup", "onboarding", "verify-method", "verify"].includes(currentView);

  return (
    <div className="min-h-screen bg-[#E8F4FD] text-slate-800 flex flex-col justify-start">
      <Toast toasts={toasts} onClose={removeToast} />

      {currentView === "landing" && <LandingView />}

      {currentView === "admin" && <AdminView />}
      {currentView === "dashboard" && <DashboardView />}

      {isCenteredCardView && (
        <div className="flex-grow flex items-center justify-center p-4 min-h-screen">
          <div className="w-full flex justify-center py-8">
            {currentView === "onboarding" && <OnboardingView initialStep={2} />}
            {currentView === "login" && <LoginView />}
            {currentView === "signup" && <SignupView />}
            {currentView === "verify-method" && <VerifyMethodView />}
            {currentView === "verify" && <VerifyOtpView />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AdrieBankingPortal />
    </AppProvider>
  );
}
