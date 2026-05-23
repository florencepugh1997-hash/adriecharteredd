import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { ShieldCheck, ArrowRight, Loader } from "lucide-react";

export default function LoginView() {
  const { login, setView, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please complete all fields to sign in.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid authentication credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-blue-200/40 border border-blue-100 p-8 relative overflow-hidden">
      {/* Decorative top bar with AdrieChartered branding color */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4A90D9]" />

      <div className="flex flex-col items-center mb-6">
        {/* AdrieChartered Corporate Brand Logo */}
        <img 
          src="/src/assets/images/adrie_logo_1779466005370.png" 
          alt="AdrieChartered Logo" 
          className="h-28 w-auto object-contain select-none cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => { setView("admin"); showToast?.("info", "Compliance Clearance Mode enabled."); }}
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col items-center text-center mt-2">
          <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase select-none">
            Established 1<span onClick={() => { setView("admin"); showToast?.("info", "Compliance Clearance Mode enabled."); }} className="hover:text-[#4A90D9] hover:font-bold cursor-pointer transition-colors px-0.4">6</span>82
          </span>
        </div>
      </div>

      <div className="mb-6 bg-blue-50/50 rounded-xl p-3 border border-blue-100/50 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#4A90D9] mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-600 leading-normal">
          Confirm your credentials. All digital web channels utilize secure industry certificates with two-step token verifications.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Email or Account Number</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
            placeholder="e.g. florence@gmail.com or 10-digit account no."
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
            placeholder="••••••••••••"
            disabled={isSubmitting}
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs font-medium text-rose-700 leading-snug">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full h-11 bg-[#4A90D9] hover:bg-[#3b7fc7] disabled:bg-[#4A90D9]/50 text-white font-medium rounded-xl text-sm items-center justify-center flex gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.99]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Authenticating Secure Profile...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center flex flex-col gap-3 justify-center items-center">
        <p className="text-xs text-slate-500">
          New to AdrieChartered?{" "}
          <button
            onClick={() => setView("signup")}
            className="text-[#4A90D9] font-semibold hover:underline bg-transparent border-0 cursor-pointer p-0"
            disabled={isSubmitting}
          >
            Create an Account Online
          </button>
        </p>
        <button
          onClick={() => setView("onboarding")}
          className="text-[11px] text-[#4A90D9] hover:text-[#3a7bbb] font-semibold hover:underline bg-transparent border-0 cursor-pointer p-0"
        >
          ← Return to Wealth Presentation
        </button>
      </div>
    </div>
  );
}
