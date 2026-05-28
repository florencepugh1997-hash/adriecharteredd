import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, CurrencyCode } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  ArrowRight, 
  Phone, 
  Mail, 
  User, 
  Lock, 
  Globe, 
  Check, 
  ArrowLeft, 
  Cpu, 
  Smartphone, 
  SquarePen, 
  Loader, 
  ChevronDown,
  Building2,
  BookmarkCheck,
  Zap,
  Sparkles,
  MessageSquare,
  ShieldQuestion
} from "lucide-react";

const COUNTRY_CODES = [
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "United States / Canada", flag: "🇺🇸" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+971", country: "U.A.E.", flag: "🇦🇪" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
];

interface OnboardingProps {
  initialStep?: number;
}

export default function OnboardingView({ initialStep = 1 }: OnboardingProps) {
  const { signup, verifyOtp, resendOtp, setView, showToast } = useApp();
  
  // Steps: 
  // 1 = Welcome / Splash stage
  // 2 = Let's get you started (Name, Email, Phone)
  // 3 = Security Credentials (Password, Preferred Account Number, Currency)
  // 4 = Verification Gate (OTP Code Entry) / or Compliance Pending success
  // 5 = Perfect Complete state (Welcome checklist & Enter Dashboard!)
  const [step, setStep] = useState(initialStep);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+44");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");

  // State Variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<"email" | "whatsapp" | "sms">("email");
  const [error, setError] = useState("");
  const [tempUserIdState, setTempUserIdState] = useState<string | null>(null);
  const [isPendingStaging, setIsPendingStaging] = useState(false);
  
  // OTP Verification States
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpHint, setOtpHint] = useState("");
  const [countdown, setCountdown] = useState(30);

  // Resend OTP interval countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Sync initialStep if passed down
  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  // Move back/forward handler
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  // Step 2 client-validation before continuing to Step 3
  const handleContinueToSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !phoneRaw.trim()) {
      setError("Please fill out your name, email, and phone coordinates.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please supply a valid corporate email coordinate.");
      return;
    }

    setStep(3);
  };

  // Step 3 final submit: triggers signup
  const handleSecuritySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please register your password parameters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Protected passcodes must be at least 6 characters.");
      return;
    }

    if (accountNumber.trim() && !/^\d{10}$/.test(accountNumber.trim())) {
      setError("Preferred Account Number must specify exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    const cleanPhoneBody = phoneRaw.replace(/\s+/g, "");
    const formattedPhone = `${phonePrefix}${cleanPhoneBody}`;

    try {
      const data = await signup({
        fullName,
        email,
        phone: formattedPhone,
        password,
        currency,
        accountNumber: accountNumber.trim() || undefined
      });

      if (data && (data as any).isPendingApproval) {
        setIsPendingStaging(true);
        setTempUserIdState((data as any).pendingId);
        setStep(4); // Move to OTP method selection Step 4
      } else if (data && data.userId) {
        setTempUserIdState(data.userId);
        setStep(4); // Move to OTP method selection Step 4
      } else {
        // Fallback
        showToast("success", "Profile registered successfully.");
        setView("login");
      }
    } catch (err: any) {
      setError(err.message || "Credential configuration rejected by standard gates.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUserIdState) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: tempUserIdState, method: verifyMethod })
      });
      const optData = await res.json();
      if (!res.ok) throw new Error(optData.error || "Failed to dispatch code.");
      
      if (optData.otpCodeHint) {
        setOtpHint(optData.otpCodeHint);
        showToast("info", `Verification Code simulated: ${optData.otpCodeHint}`);
      }
      setStep(5); // Move to OTP entry
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP field entry navigation
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const updatedOtp = [...otpCode];
    updatedOtp[index] = cleanVal;
    setOtpCode(updatedOtp);

    // Focus next box automatically if typed
    if (cleanVal && index < 5) {
      const nextNode = document.getElementById(`otp-input-${index + 1}`);
      nextNode?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      const prevNode = document.getElementById(`otp-input-${index - 1}`);
      prevNode?.focus();
    }
  };

  // Submits the OTP code
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = otpCode.join("");
    if (fullCode.length < 6) {
      setError("Please fulfill the complete 6-digit confirmation key.");
      return;
    }

    if (!tempUserIdState) {
      setError("Identity authentication context is missing. Retrying signup is advised.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOtp(tempUserIdState, fullCode);
      if (res && res.isPending) {
        setIsPendingStaging(true);
      }
      // Success will trigger complete screen
      setStep(6);
    } catch (err: any) {
      setError(err.message || "Confirmation digits rejected. Please verify the numbers.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles requesting a fresh OTP simulation
  const handleResendCode = async () => {
    if (!tempUserIdState) return;
    try {
      const data = await resendOtp(tempUserIdState);
      if (data && data.otpCodeHint) {
        setOtpHint(data.otpCodeHint);
        showToast("info", `Fresh code simulated: ${data.otpCodeHint}`);
      }
      setCountdown(30);
    } catch (err: any) {
      showToast("error", err.message || "Failed to dispatch backup digits.");
    }
  };

  return (
    <div className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl border border-blue-50 overflow-hidden relative flex flex-col md:flex-row min-h-[640px] font-sans antialiased text-slate-800">
      {/* Decorative branding color accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4A90D9] z-20" />

      {/* LEFT PRESENTATION BAR: Elegant details of benefits and custom line art skyscraper */}
      <div className="w-full md:w-[38%] bg-slate-900 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shrink-0 border-r border-slate-800/20">
        {/* Sky-blue decorative background gradients */}
        <div className="absolute -top-16 -left-16 w-80 h-80 bg-slate-800 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#4A90D9]/15 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Brand Header */}
        <div className="z-10 flex items-center gap-3">
          <img 
            src="/src/assets/images/adrie_logo_1779466005370.png" 
            alt="AdrieChartered Corporate Emblem" 
            className="h-10 w-auto bg-white rounded-lg p-0.5 object-contain shadow-md select-none"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <h2 className="text-sm font-bold tracking-tight text-white leading-none">AdrieChartered</h2>
            <p className="text-[7.5px] font-mono tracking-widest text-[#4A90D9] uppercase font-bold mt-1">Sovereign Wealth Gate</p>
          </div>
        </div>

        {/* Benefit Bullet Lists (Desktop Only layout) */}
        <div className="my-10 z-10 space-y-7 md:block hidden animate-fade-in">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-serif text-slate-50 tracking-tight leading-snug">
              Welcome to <br/>
              <span className="text-[#4A90D9] font-serif font-bold">AdrieChartered</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium font-sans">
              Modern banking for your every ambition.
            </p>
          </div>

          <div className="space-y-5 pt-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-blue-500/10 text-[#4A90D9] rounded-xl border border-blue-400/20 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 font-sans">Bank with confidence</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Top-tier security to keep your money and data safe.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-blue-500/10 text-[#4A90D9] rounded-xl border border-blue-400/20 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 font-sans">Manage with ease</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Intuitive tools to help you track, transfer, and grow.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-blue-500/10 text-[#4A90D9] rounded-xl border border-blue-400/20 shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 font-sans">Bank anytime, anywhere</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">Seamless access across all your devices.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 bg-blue-500/10 text-[#4A90D9] rounded-xl border border-blue-400/20 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 font-sans">Here for you</h4>
                <p className="text-[11px] text-slate-400 leading-normal mt-0.5">24/7 priority support from our dedicated banking team.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-oriented simplified benefit badge */}
        <div className="md:hidden z-10 my-4 bg-slate-800/40 border border-slate-800/70 p-3 rounded-2xl flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#4A90D9] shrink-0" />
          <span className="text-[11px] text-slate-350">
            Sovereign high-velocity private digital banking profile.
          </span>
        </div>

        {/* Elegant Skyscraper illustration at bottom left */}
        <div className="relative z-10 mt-auto pt-6 border-t border-slate-800/50 flex flex-col justify-end">
          {/* Dynamic styled modern skyscraper vector composition */}
          <div className="h-20 w-full relative opacity-40 hover:opacity-75 transition-opacity duration-300 md:block hidden">
            <svg viewBox="0 0 300 100" className="w-full h-full text-[#4A90D9]" fill="currentColor">
              <rect x="10" y="40" width="30" height="60" rx="2" className="text-slate-700" />
              <rect x="50" y="10" width="45" height="90" rx="3" className="text-blue-900/60" />
              <rect x="105" y="30" width="35" height="70" rx="2" className="text-slate-800" />
              <rect x="150" y="5" width="50" height="95" rx="4" className="text-blue-950" />
              <rect x="210" y="50" width="25" height="50" rx="2" className="text-slate-700" />
              <rect x="245" y="20" width="40" height="80" rx="3" className="text-[#4A90D9]/30" />
              {/* Floating lines */}
              <line x1="0" y1="98" x2="300" y2="98" stroke="#4A90D9" strokeWidth="2" opacity="0.5" />
              {/* Tiny window blocks */}
              <rect x="60" y="20" width="6" height="8" rx="1" fill="#fff" opacity="0.3" />
              <rect x="75" y="20" width="6" height="8" rx="1" fill="#fff" opacity="0.3" />
              <rect x="60" y="35" width="6" height="8" rx="1" fill="#fff" opacity="0.3" />
              <rect x="75" y="35" width="6" height="8" rx="1" fill="#fff" opacity="0.3" />
              <rect x="165" y="20" width="8" height="10" rx="1" fill="#fff" opacity="0.4" />
              <rect x="180" y="20" width="8" height="10" rx="1" fill="#fff" opacity="0.4" />
              <rect x="165" y="40" width="8" height="10" rx="1" fill="#fff" opacity="0.4" />
              <rect x="180" y="40" width="8" height="10" rx="1" fill="#fff" opacity="0.4" />
            </svg>
            <div className="absolute left-14 bottom-8 flex items-center justify-center bg-[#4A90D9] text-white p-1.5 rounded-lg shadow-md border border-white/20">
              <span className="text-[10px] font-bold leading-none tracking-tight">AC</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
            <span>REGULATED UNDER CORE ACT 1682</span>
            <span>SECURE GATEWAY</span>
          </div>
        </div>
      </div>

      {/* RIGHT WORKFLOW PANEL: Dynamic steps corresponding to Mockups */}
      <div className="flex-grow p-6 md:p-10 bg-white flex flex-col justify-between relative min-h-[580px]">
        
        {/* Header Action Link (Except for Completed complete step) */}
        {step < 5 && (
          <div className="flex justify-end items-center text-xs text-slate-500 mb-6 z-10 relative">
            <span>Already have an account?</span>
            <button 
              onClick={() => setView("login")}
              className="ml-2 font-bold text-[#4A90D9] hover:text-[#327fc9] hover:underline bg-transparent border-0 cursor-pointer p-0"
            >
              Log in
            </button>
          </div>
        )}

        {/* STEPPER PROGRESS INDICATOR (Displayed on Step 2, 3, 4, 5) */}
        {step >= 2 && step <= 5 && (
          <div className="w-full max-w-lg mx-auto mb-8 z-10">
            <div className="flex items-center justify-between relative">
              {/* Stepper background line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-slate-100 z-0" />
              
              {/* Stepper active progression track line */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-blue-500 transition-all duration-300 z-0" 
                style={{ width: `${Math.min(step - 2, 2) * 50}%` }}
              />

              {/* Step item 1 */}
              <div className="flex flex-col items-center relative z-10 bg-white px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > 2 ? "bg-blue-500 text-white" : "bg-blue-500 text-white ring-4 ring-blue-50"
                }`}>
                  {step > 2 ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <span className="text-[9px] font-semibold text-slate-600 mt-1.5 uppercase tracking-wider">Info</span>
              </div>

              {/* Step item 2 */}
              <div className="flex flex-col items-center relative z-10 bg-white px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > 3 ? "bg-blue-500 text-white" : step === 3 ? "bg-blue-500 text-white ring-4 ring-blue-50" : "bg-slate-100 text-slate-400"
                }`}>
                  {step > 3 ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <span className="text-[9px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wider">Security</span>
              </div>

              {/* Step item 3 */}
              <div className="flex flex-col items-center relative z-10 bg-white px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= 4 ? "bg-blue-500 text-white ring-4 ring-blue-50" : "bg-slate-100 text-slate-400"
                }`}>
                  {step > 5 ? <Check className="w-4 h-4" /> : "3"}
                </div>
                <span className="text-[9px] font-semibold text-slate-500 mt-1.5 uppercase tracking-wider">Verify</span>
              </div>
            </div>
          </div>
        )}

        {/* FLOW CONTENT WRAPPERS */}
        <div className="flex-grow flex flex-col justify-center items-center z-10 w-full max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            
            {/* SCREEN/STEP 1: Landing Presentation / Splash screen */}
            {step === 1 && (
              <motion.div
                key="splash-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col items-center text-center space-y-6"
              >
                {/* Brand Corporate Logo Display */}
                <div className="flex flex-col items-center">
                  <img 
                    src="/src/assets/images/adrie_logo_1779466005370.png" 
                    alt="AdrieChartered Logo" 
                    className="h-28 w-auto object-contain select-none mb-1 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold">Banking Beyond Limits</p>
                </div>

                {/* Main titles matched exactly to Screen 1 mockup */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif text-slate-900 tracking-tight leading-snug max-w-xs mx-auto">
                    Smart banking <br /> 
                    for your <span className="text-blue-500 font-serif">world.</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium font-sans">
                    Secure. Simple. Always with you.
                  </p>
                </div>

                {/* Floating graphic platform matching vector model in Screen 1 mockup */}
                <div className="w-full max-w-[280px] py-4 select-none relative flex justify-center items-center">
                  <div className="absolute inset-0 bg-blue-50/60 rounded-full blur-2xl opacity-70" />
                  
                  {/* Neoclassic Greek Columns Platform drawing with CSS */}
                  <div className="relative w-44 h-28 bg-[#E8F4FD]/70 rounded-full border border-blue-100 flex flex-col items-center justify-center p-3 shadow-inner transform rotate-[-4deg]">
                    
                    {/* Floating Shield badge */}
                    <div className="absolute -top-3 -left-3 p-2 bg-blue-500 text-white rounded-xl shadow-lg border border-white animate-bounce" style={{ animationDuration: '3s' }}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>

                    {/* Floating credit card or digital layout device */}
                    <div className="absolute -bottom-2 -right-3 p-1.5 bg-white text-blue-500 rounded-lg shadow-md border border-blue-50 flex items-center gap-1">
                      <span className="font-mono text-[7px] font-bold">AC</span>
                      <div className="w-4 h-2.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xs" />
                    </div>

                    {/* Simple neoclassic columns facade logo */}
                    <div className="text-blue-400 flex flex-col items-center">
                      <div className="w-12 h-1 bg-current rounded-full" />
                      <div className="flex gap-1.5 my-1.5">
                        <div className="w-1.5 h-10 bg-current rounded-sm" />
                        <div className="w-1.5 h-10 bg-current rounded-sm" />
                        <div className="w-1.5 h-10 bg-current rounded-sm" />
                      </div>
                      <div className="w-14 h-1 bg-current rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Step Action Button */}
                <button
                  onClick={() => setStep(2)}
                  className="w-full max-w-xs h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center justify-between px-6 cursor-pointer shadow-lg shadow-blue-400/20 hover:shadow-blue-300 transition-all transform hover:scale-[1.01] active:scale-[0.99] group mt-4 border-0"
                >
                  <span className="text-xs">Get Started</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform" />
                </button>
              </motion.div>
            )}

            {/* SCREEN/STEP 2: Personal details matching Screen 2 style */}
            {step === 2 && (
              <motion.div
                key="personal-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                {/* Greek Temple mini banner in soft blues */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                    <Building2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Let’s get you started 👋</h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Create your AdrieChartered account in a few simple steps.
                  </p>
                </div>

                <form onSubmit={handleContinueToSecurity} className="space-y-4 pt-1">
                  {/* Full Name input block */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all placeholder:text-slate-400 font-sans"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  {/* Email input block */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all placeholder:text-slate-400"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone number prefix picker + raw body */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="relative shrink-0">
                        <select
                          value={phonePrefix}
                          onChange={(e) => setPhonePrefix(e.target.value)}
                          className="pl-3 pr-7 h-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all appearance-none cursor-pointer font-mono font-bold"
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.flag} {country.code}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
                          <ChevronDown className="w-3.5 h-3.5 text-slate-450" />
                        </div>
                      </div>

                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          type="tel"
                          value={phoneRaw}
                          onChange={(e) => setPhoneRaw(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all placeholder:text-slate-400 font-mono"
                          placeholder="Enter your number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-600 text-center">
                      {error}
                    </div>
                  )}

                  {/* Form continue action */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] border-0 outline-none"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </form>

                {/* Back Link and regulatory terms */}
                <div className="flex flex-col gap-4 text-center">
                  <button
                    onClick={handleBack}
                    className="text-[11px] text-slate-400 hover:text-slate-650 font-bold bg-transparent border-0 cursor-pointer self-center"
                  >
                    ← Give up and go back
                  </button>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                    By continuing, you agree to our <span className="font-semibold text-blue-400 hover:underline cursor-pointer">Terms of Use</span> and <span className="font-semibold text-blue-400 hover:underline cursor-pointer">Privacy Policy</span>.
                  </p>
                </div>
              </motion.div>
            )}

            {/* SCREEN/STEP 3: Profile credentials page */}
            {step === 3 && (
              <motion.div
                key="security-credentials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-5"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Establish Gate Security</h2>
                  <p className="text-[11px] text-slate-500">
                    Defend your vault profile with password secrets and parameters.
                  </p>
                </div>

                <form onSubmit={handleSecuritySignup} className="space-y-3.5 pt-1">
                  
                  {/* Select currency parameters */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#4A90D9]" />
                      Sovereign Currency Denomination
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="w-full px-4 h-11 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all cursor-pointer"
                    >
                      {CURRENCIES.map((desc) => (
                        <option key={desc.code} value={desc.code}>
                          {desc.flag} {desc.code} — {desc.name} ({desc.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preferred 10-Digit number class */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Desired Account Identity <span className="text-slate-350 font-normal lowercase">(Optional, 10 digits)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 h-11 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all font-mono"
                      placeholder="e.g. 1092837465"
                    />
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guard Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Guard</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl text-xs outline-none transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-600 text-center">
                      {error}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="w-1/3 h-12 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-xs border border-slate-200 cursor-pointer transition-all focus:outline-none"
                    >
                      Back
                    </button>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-grow h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 transition-all border-0 outline-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin text-white" />
                          <span>Provisioning Vault...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify &amp; Create Wallet</span>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="text-center">
                  <p className="text-[10px] text-slate-400">
                    Accounts are automatically injected with £1,000.00 pre-authorized opening balance.
                  </p>
                </div>
              </motion.div>
            )}

            {/* SCREEN/STEP 4: Choose Verification Method */}
            {step === 4 && (
              <motion.div
                key="choose-method"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                    <ShieldQuestion className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">Verify Your Identity</h2>
                  <p className="text-slate-500 text-xs text-center mt-1">Select your preferred two-step security delivery endpoint</p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-600 text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-3.5">
                  <button
                    type="button"
                    onClick={() => setVerifyMethod("email")}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      verifyMethod === "email" ? "border-blue-500 bg-blue-50/20" : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${verifyMethod === "email" ? "bg-blue-100 text-blue-500" : "bg-slate-100 text-slate-500"}`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send to my Email</h3>
                      <p className="text-slate-400 text-[10px] mt-1">Standard SMTP Electronic notice</p>
                      <p className="text-blue-500 font-mono text-xs font-bold mt-1 tracking-wider">{email || "Configured Email"}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyMethod("whatsapp")}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      verifyMethod === "whatsapp" ? "border-blue-500 bg-blue-50/20" : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${verifyMethod === "whatsapp" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send via WhatsApp</h3>
                      <p className="text-slate-400 text-[10px] mt-1">Twilio WhatsApp business message</p>
                      <p className="text-blue-500 font-mono text-xs font-bold mt-1 tracking-wider">{phonePrefix} {phoneRaw}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerifyMethod("sms")}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                      verifyMethod === "sms" ? "border-blue-500 bg-blue-50/20" : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${verifyMethod === "sms" ? "bg-blue-100 text-blue-500" : "bg-slate-100 text-slate-500"}`}>
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send via SMS</h3>
                      <p className="text-slate-400 text-[10px] mt-1">Twilio cellular text notification</p>
                      <p className="text-blue-500 font-mono text-xs font-bold mt-1 tracking-wider">{phonePrefix} {phoneRaw}</p>
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 transition-all border-0 outline-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-white" />
                      <span>Dispatched security code...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Security Code</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* SCREEN/STEP 5: Verify Identity via OTP (Screen 3 representation) */}
            {step === 5 && (
              <motion.div
                key="verify-identity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full space-y-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                    {verifyMethod === "email" ? (
                      <Mail className="w-8 h-8 text-blue-500" />
                    ) : (
                      /* Security Lock Card icon matching Mockup 3 */
                      <svg viewBox="0 0 64 64" className="w-11 h-11 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="14" y="22" width="36" height="28" rx="6" fill="currentColor" className="text-blue-50" />
                        <path d="M22 22V15C22 10 26 6 32 6C38 6 42 10 42 15V22" strokeLinecap="round" />
                        <circle cx="32" cy="34" r="3" fill="currentColor" className="text-blue-500" />
                        <path d="M32 37V42" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
                    {verifyMethod === "email" ? "Verify your email" : "Verify your number"}
                  </h2>
                  
                  <div className="flex items-center gap-1.5 justify-center mt-1 text-slate-500 text-xs flex-wrap">
                    <span>Enter the 6-digit code sent to</span>
                    {verifyMethod === "email" ? (
                      <>
                        <strong className="text-slate-800 font-bold">{email.toLowerCase()}</strong>
                        <button 
                          onClick={() => setStep(2)} 
                          className="p-1 hover:bg-slate-100 rounded text-[#4A90D9] bg-transparent border-0 cursor-pointer"
                          title="Edit email coordinates"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <strong className="text-slate-800 font-bold font-mono">
                          {phonePrefix} {phoneRaw}
                        </strong>
                        <button 
                          onClick={() => setStep(2)} 
                          className="p-1 hover:bg-slate-100 rounded text-[#4A90D9] bg-transparent border-0 cursor-pointer"
                          title="Edit phone number coordinates"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
                  {/* Digital round code inputs matching visual design elements of Screen 3 */}
                  <div className="flex justify-between gap-2 max-w-sm mx-auto">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-input-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-12 text-center text-lg font-bold font-mono bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none transition-all shadow-sm"
                        placeholder="•"
                        required
                      />
                    ))}
                  </div>



                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-semibold text-rose-600 text-center">
                      {error}
                    </div>
                  )}

                  {/* Resend info countdown indicator */}
                  <div className="text-center text-xs">
                    {countdown > 0 ? (
                      <p className="text-slate-400">
                        Didn't receive the code? Resend (<strong className="font-mono text-slate-600">00:{countdown.toString().padStart(2, "0")}</strong>)
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-transparent border-0 cursor-pointer hover:underline p-0"
                      >
                        Resend Code digits
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center justify-between px-6 cursor-pointer shadow-md shadow-blue-500/10 transition-all border-0 outline-none"
                  >
                    <span>Verify &amp; Continue</span>
                    {isSubmitting ? (
                      <Loader className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-white" />
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => setStep(4)}
                    className="text-xs text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer font-bold"
                  >
                    ← Give up and change delivery method
                  </button>
                </div>
              </motion.div>
            )}

            {/* SCREEN/STEP 6: Registration finish block. Supports pending and active approvals!  */}
            {step === 6 && (
              <motion.div
                key="finish-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full flex flex-col items-center text-center space-y-6"
              >
                
                {/* Visual Circle Check design matching Screen 5 mockup */}
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-40 scale-150 animate-pulse" />
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-lg relative z-10">
                    <Check className="w-10 h-10 text-emerald-500 stroke-[3px]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl font-serif text-slate-900 tracking-tight leading-snug">
                    {isPendingStaging ? "Onboarding Request Queued" : "Welcome to AdrieChartered!"}
                  </h1>
                  <p className="text-[10px] font-mono tracking-widest text-[#4A90D9] uppercase font-bold mt-1">
                    {isPendingStaging ? "Pending Compliance Audit" : "Your account has been created successfully"}
                  </p>
                </div>

                {isPendingStaging ? (
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    We have securely stored your credentials and queued your registration for validation. Our compliance team Superintendent <span className="font-bold text-slate-800 underline">Charles</span> will authorize your profile shortly.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Your sovereign account node has been authenticated and provisioned. You can now access your dashboard.
                  </p>
                )}

                {/* Staging properties report box */}
                <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Owner Registered</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Email Coordinates</span>
                    <span className="font-semibold text-slate-600">{email.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Currency Class</span>
                    <span className="font-semibold text-slate-600">{currency} Account</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Status</span>
                    <span className="font-bold flex items-center gap-1.5 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                      {isPendingStaging ? "Staged for review" : "Active & Verified"}
                    </span>
                  </div>
                </div>

                {/* Benefits / Check indicators matching Screen 5 from UI design assets */}
                <div className="w-full space-y-3.5 pt-1 text-left max-w-sm mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-[#4A90D9] flex items-center justify-center border border-blue-100/50 shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-705">Your account is secure</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-[#4A90D9] flex items-center justify-center border border-blue-100/50 shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-705">Bank 24/7, anywhere</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-[#4A90D9] flex items-center justify-center border border-blue-100/50 shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-slate-705">Manage, transfer &amp; grow</span>
                  </div>
                </div>

                {isPendingStaging ? (
                  <div className="w-full space-y-3 pt-2">
                    <button
                      onClick={() => setView("login")}
                      className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md focus:outline-none border-0 transition-opacity"
                    >
                      Go to Login Panel
                    </button>
                    <button
                      onClick={() => {
                        // Reset flow for sandbox ease
                        setStep(1);
                        setIsPendingStaging(false);
                        setFullName("");
                        setEmail("");
                        setPhoneRaw("");
                        setPhonePrefix("+44");
                        setPassword("");
                        setConfirmPassword("");
                        setAccountNumber("");
                      }}
                      className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all focus:outline-none"
                    >
                      ← Back to Start / Create New
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setView("dashboard")}
                    className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center justify-between px-6 cursor-pointer shadow-lg shadow-blue-400/20 hover:shadow-blue-300 transition-all border-0 mt-4"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Regulatory Bank License info footer (Always visible on bottom) */}
        <div className="mt-8 text-[9px] text-slate-400 font-light select-none text-center border-t border-slate-100/80 pt-4 z-10 w-full">
          AdrieChartered Bank PLC is authorized by the Prudential Regulation Authority and regulated under Compliance Act 1682. All funds protected by financial safety guidelines.
        </div>
      </div>
    </div>
  );
}
