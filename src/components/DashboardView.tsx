import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, Transaction } from "../types.js";
import { Home, Send, History as HistoryIcon, User as UserIcon, PlusCircle, ArrowUpRight, ArrowDownLeft, Shield, Bell, HelpCircle, ArrowRight, Loader } from "lucide-react";

import FundView from "./FundView.jsx";
import TransferView from "./TransferView.jsx";
import HistoryView from "./HistoryView.jsx";
import ProfileView from "./ProfileView.jsx";
import BrandLogo from "./BrandLogo.jsx";
import UserAvatar from "./UserAvatar.jsx";

export default function DashboardView() {
  const {
    user,
    token,
    refreshUserData,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    dashboardTab: activeTab,
    setDashboardTab: setActiveTab,
  } = useApp();

  const [showFundModal, setShowFundModal] = useState(false);
  const [isSecretFund, setIsSecretFund] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const openStandardFundModal = () => {
    setIsSecretFund(false);
    setShowFundModal(true);
  };

  const handleSecretDotClick = () => {
    setIsSecretFund(true);
    setShowFundModal(true);
  };

  useEffect(() => {
    if (activeTab === "home") {
      fetchRecentLedger();
      refreshUserData();
    }
  }, [activeTab, token]);

  const fetchRecentLedger = async () => {
    if (!token) return;
    setLoadingRecent(true);
    try {
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "5", // fetch latest 5 matching
      });
      const res = await fetch(`/api/transactions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to query core ledger:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  if (!user) return null;

  // Retrieve matching config
  const currentCurrency = CURRENCIES.find((c) => c.code === user.currency) || CURRENCIES[0];

  // Mask Account Number on Card: display only last 4 digits
  const maskedAccountNumber = `•••• •••• ${user.accountNumber.slice(-4)}`;

  // Custom greeting helper
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  };

  const getFirstName = () => {
    return user.fullName.split(" ")[0];
  };

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="flex h-screen w-full bg-[#E8F4FD] font-sans text-slate-800 overflow-hidden">
      {/* 1. Sidebar Navigation (Visible only on md screens and larger) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-blue-100 flex-col pt-8 pb-6 justify-between shrink-0 h-full">
        <div className="flex flex-col flex-1">
          {/* Logo block */}
          <div className="px-5 pb-6 flex items-center gap-2.5">
            <BrandLogo className="h-11 w-auto object-contain select-none bg-white rounded-lg p-0.5 border border-slate-50" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#4A90D9] leading-none font-sans">AdrieChartered</span>
              <span className="text-[7.5px] text-slate-400 font-mono tracking-widest mt-1 uppercase font-bold">UK PORTAL</span>
            </div>
          </div>
          
          {/* Navigation Items */}
          <nav className="px-4 space-y-1.5 mt-6">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-0 bg-transparent text-left ${
                activeTab === "home"
                  ? "bg-[#E8F4FD] text-[#4A90D9]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Home className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("send")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-0 bg-transparent text-left ${
                activeTab === "send"
                  ? "bg-[#E8F4FD] text-[#4A90D9]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Send className="w-4.5 h-4.5" />
              <span>Transfers</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-0 bg-transparent text-left ${
                activeTab === "history"
                  ? "bg-[#E8F4FD] text-[#4A90D9]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <HistoryIcon className="w-4.5 h-4.5" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-0 bg-transparent text-left ${
                activeTab === "profile"
                  ? "bg-[#E8F4FD] text-[#4A90D9]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <UserIcon className="w-4.5 h-4.5" />
              <span>Profile</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* 2. Main Content Right Side Viewport Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Responsive Top Header */}
        <header className="flex justify-between items-center px-6 py-6 md:px-8 border-b border-blue-100/30 bg-white shrink-0 z-20">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              {getGreeting()}, {getFirstName()}
            </h1>
            <p className="text-slate-500 text-xs hidden md:block">
              Banking Built Around You • {formattedDate}
            </p>
            <p className="text-slate-500 text-xs font-semibold md:hidden mt-0.5">
              AdrieChartered UK Portal
            </p>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-semibold text-emerald-700 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-[#4A90D9] relative hover:bg-slate-50 rounded-xl transition-all cursor-pointer border-0 bg-transparent flex items-center justify-center focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 px-1 min-w-4 h-4 bg-rose-500 rounded-full text-[8px] text-white font-mono font-bold flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel overlay */}
              {showNotifications && (
                <div className="absolute right-0 mt-3.5 w-80 md:w-96 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">Notifications Center</h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => clearAllNotifications()}
                        className="text-[10px] font-bold text-rose-500 cursor-pointer border-0 bg-transparent hover:underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 font-sans">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No alerts or message notifications.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3.5 text-left transition-colors cursor-pointer ${notif.read ? 'bg-white hover:bg-slate-50/50' : 'bg-blue-50/30 hover:bg-blue-50/50'}`}
                        >
                          <div className="flex gap-2.5 items-start">
                            <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                              notif.type === 'failed' ? 'bg-rose-500' :
                              notif.type === 'success' ? 'bg-emerald-500' : 'bg-[#4A90D9]'
                            }`} />
                            <div className="space-y-0.5 flex-1 select-none">
                              <p className="text-xs font-bold text-slate-800 leading-tight">
                                {notif.title}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="text-[8px] font-mono text-slate-400 pt-1">
                                {new Date(notif.timestamp).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})} • {new Date(notif.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              onClick={() => setActiveTab("profile")}
              className="cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="View Profile Settings"
            >
              <UserAvatar user={user} className="w-9 h-9 md:w-10 md:h-10" textClassName="text-xs md:text-sm" />
            </div>
          </div>
        </header>

        {/* Tabs Main Content Window Frame */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 no-scrollbar pb-24 md:pb-8">
          
          {/* VIEW: HOME SUBVIEW (Dynamic arrangement mimicking layout) */}
          {activeTab === "home" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 animate-fade-in items-start">
              
              {/* Left Column Section: Cards and Transactions */}
              <div className="lg:col-span-8 space-y-8 flex flex-col">
                
                {/* Balance & Premium Debit Card Component */}
                <div className="bg-gradient-to-br from-[#4A90D9] to-[#3b79bc] rounded-[32px] p-8 text-white shadow-xl shadow-blue-200/50 relative overflow-hidden h-60 min-h-[220px] flex flex-col justify-between shrink-0">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider opacity-85">Total Balance</p>
                        <h2 className="text-4xl md:text-5xl font-bold mt-1 tracking-tight">
                          {currentCurrency.symbol}
                          {user.balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                        </h2>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase font-mono border border-white/10">
                        <span>{currentCurrency.flag}</span>
                        <span>{user.currency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex justify-between items-end">
                    <div className="flex gap-8 md:gap-12">
                      <div>
                        <p className="text-blue-100 text-[9px] font-bold uppercase tracking-widest opacity-60">Account Number</p>
                        <p className="font-mono text-sm md:text-base mt-1 tracking-widest font-bold">{maskedAccountNumber}</p>
                      </div>
                      <div>
                        <p className="text-blue-100 text-[9px] font-bold uppercase tracking-widest opacity-60">Sort Code</p>
                        <p className="font-mono text-sm md:text-base mt-1 tracking-widest font-bold">{user.sortCode}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-blue-150 font-mono font-bold tracking-wider leading-none">PLATINUM</span>
                      <span className="font-bold text-white text-base tracking-tight mt-1">AC</span>
                    </div>
                  </div>

                  {/* Aesthetic backgrounds */}
                  <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="absolute right-10 -top-20 w-40 h-40 bg-white/5 rounded-full blur-md pointer-events-none"></div>
                </div>

                {/* Recent Statement Listing Card */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col flex-1 min-h-[300px]">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-50">
                    <h3 className="font-bold text-base md:text-lg text-slate-800">Recent Transactions</h3>
                    {recentTransactions.length > 5 && (
                      <button 
                        onClick={() => setActiveTab("history")}
                        className="text-[#4A90D9] text-xs font-semibold hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        View All
                      </button>
                    )}
                  </div>

                  {loadingRecent ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 flex-1">
                      <Loader className="w-6 h-6 animate-spin text-[#4A90D9]" />
                      <span className="text-xs text-slate-400 font-medium font-mono">Querying security logs...</span>
                    </div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="py-12 flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                      <span className="block text-slate-400 text-xs font-semibold">No transactions recorded</span>
                      <button
                        onClick={openStandardFundModal}
                        className="mt-3.5 px-4 h-9 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white rounded-xl text-xs font-semibold cursor-pointer border-none"
                      >
                        Deposit Funds to Start
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 flex-1">
                      {recentTransactions.slice(0, 4).map((tx) => {
                        const txCurrency = CURRENCIES.find((c) => c.code === tx.currency) || currentCurrency;
                        const cleanDate = new Date(tx.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });

                        return (
                          <div key={tx._id} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/30 rounded-2xl transition-all">
                            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                              {tx.type === "credit" ? (
                                <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0 border border-emerald-100">
                                  <ArrowDownLeft className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 md:w-11 md:h-11 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shrink-0 border border-rose-100">
                                  <ArrowUpRight className="w-5 h-5" />
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <p className="font-bold text-slate-800 text-xs md:text-sm truncate">
                                  {tx.type === "credit" ? "Account Deposit" : tx.recipientName}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {cleanDate} • Ref: {tx.reference}
                                </p>
                              </div>
                            </div>
                            <p className={`font-mono font-bold text-xs md:text-sm shrink-0 pl-2 ${
                              tx.type === "credit" ? "text-emerald-500" : "text-rose-500"
                            }`}>
                              {tx.type === "credit" ? "+" : "-"} {txCurrency.symbol}
                              {tx.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column Section: Fundings and Interactive Card Blocks */}
              <div className="lg:col-span-4 space-y-6 flex flex-col">
                
                {/* Sleek Quick Actions panel */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100">
                  <h3 className="font-bold text-base md:text-lg text-slate-800 mb-5 pb-2 border-b border-slate-50">Quick Tools</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={openStandardFundModal}
                      className="w-full h-12 bg-[#4A90D9] text-white hover:bg-[#3b7fc7] active:scale-[0.98] transition-all font-bold rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md shadow-blue-200"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Deposit Funds</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("send")}
                      className="w-full h-12 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-100 active:scale-[0.98] transition-all font-bold rounded-2xl flex items-center justify-center gap-2 text-xs"
                    >
                      <Send className="w-4 h-4" />
                      <span>Initiate Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Platinum Card Management element */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-14 h-10 bg-slate-800 rounded-lg relative overflow-hidden shrink-0 shadow-sm">
                    <div className="absolute top-2 left-2 w-4 h-3 bg-yellow-400/50 rounded-sm"></div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-orange-400 rounded-full -ml-2"></div>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-xs italic truncate">Adrie Platinum Account</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-0.5">•••• {user.accountNumber.slice(-4)}</p>
                  </div>
                  <div className="ml-auto shrink-0 select-none">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-bold border border-emerald-100 uppercase font-mono">
                      Active
                    </span>
                  </div>
                </div>

                {/* Additional informative instructions block */}
                <div className="bg-sky-50/40 rounded-3xl p-6 border border-blue-100/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Instruction Manual</p>
                  <p className="text-[11px] text-slate-600 leading-normal mt-2">
                    Verify account status, test live outbound payments or customize preferred currency symbols directly in your profile view<span 
                      onClick={handleSecretDotClick}
                      className="cursor-pointer font-bold text-slate-650 hover:text-blue-500 hover:scale-110 duration-200 px-0.5 inline-block select-none"
                    >.</span>
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* VIEW: OUTBOUND PAYMENTS VIEW (TRANSFER) */}
          {activeTab === "send" && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <TransferView onSuccessClose={() => setActiveTab("home")} />
            </div>
          )}

          {/* VIEW: SEARCHABLE STATEMENT HISTORY (HISTORY) */}
          {activeTab === "history" && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <HistoryView />
            </div>
          )}

          {/* VIEW: DIGITAL USER PROFILE (PROFILE) */}
          {activeTab === "profile" && (
            <div className="animate-fade-in max-w-3xl mx-auto">
              <ProfileView />
            </div>
          )}

        </div>
      </div>

      {/* 3. Sticky Bottom Tab Navigation (Only visible on mobile/tablet <md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 h-16 shadow-lg flex items-center px-4 justify-around rounded-t-2xl">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1.5 p-2 bg-transparent border-none cursor-pointer ${
            activeTab === "home" ? "text-[#4A90D9]" : "text-slate-400 hover:text-slate-605"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("send")}
          className={`flex flex-col items-center gap-1.5 p-2 bg-transparent border-none cursor-pointer ${
            activeTab === "send" ? "text-[#4A90D9]" : "text-slate-400 hover:text-slate-605"
          }`}
        >
          <Send className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Send</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1.5 p-2 bg-transparent border-none cursor-pointer ${
            activeTab === "history" ? "text-[#4A90D9]" : "text-slate-400 hover:text-slate-650"
          }`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">History</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1.5 p-2 bg-transparent border-none cursor-pointer ${
            activeTab === "profile" ? "text-[#4A90D9]" : "text-slate-400 hover:text-slate-650"
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Profile</span>
        </button>
      </nav>

      {/* Inward fund deposit Overlay modal */}
      {showFundModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <FundView
            isSecretPath={isSecretFund}
            onSuccess={() => {
              setShowFundModal(false);
              fetchRecentLedger();
              refreshUserData();
            }}
            onCancel={() => setShowFundModal(false)}
          />
        </div>
      )}
    </div>
  );
}
