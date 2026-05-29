import { useApp } from "../context/AppContext.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { ArrowRight, ShieldCheck, Smartphone, Globe, Sparkles } from "lucide-react";

export default function LandingView() {
  const { setView } = useApp();

  return (
    <div className="min-h-screen bg-[#E8F4FD] flex flex-col">
      {/* Top nav */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-12 w-auto object-contain" />
          <div className="hidden sm:block">
            <p className="font-bold text-[#4A90D9] text-sm leading-none">AdrieChartered</p>
            <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-1">Banking Built Around You</p>
          </div>
        </div>
        <button
          onClick={() => setView("login")}
          className="text-sm font-semibold text-[#4A90D9] hover:text-[#3b7fc7] bg-transparent border-0 cursor-pointer"
        >
          Log in
        </button>
      </header>

      {/* Hero */}
      <main className="flex-grow flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          {/* Left — dark panel */}
          <div className="bg-slate-900 text-white rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#4A90D9]/20 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Est. 1682</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif leading-snug">
                Welcome to <span className="text-[#4A90D9]">AdrieChartered</span>
              </h2>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#4A90D9] shrink-0" />
                  <span><strong className="text-white">Bank with confidence</strong> — enterprise-grade security on every transaction.</span>
                </li>
                <li className="flex gap-3">
                  <Globe className="w-5 h-5 text-[#4A90D9] shrink-0" />
                  <span><strong className="text-white">Manage with ease</strong> — multi-currency accounts and instant transfers.</span>
                </li>
                <li className="flex gap-3">
                  <Smartphone className="w-5 h-5 text-[#4A90D9] shrink-0" />
                  <span><strong className="text-white">Bank anytime, anywhere</strong> — your private portal, always online.</span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#4A90D9] shrink-0" />
                  <span><strong className="text-white">Here for you</strong> — dedicated support when you need it.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right — CTA */}
          <div className="flex flex-col items-center text-center space-y-6">
            <BrandLogo className="h-32 w-auto object-contain" />
            <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">Banking Beyond Limits</p>

            <div className="space-y-2 max-w-sm">
              <h1 className="text-3xl md:text-4xl font-serif text-slate-900 tracking-tight leading-snug">
                Smart banking <br />
                for your <span className="text-[#4A90D9]">world.</span>
              </h1>
              <p className="text-sm text-slate-500">Secure. Simple. Always with you.</p>
            </div>

            <div className="w-full max-w-xs space-y-3 pt-2">
              <button
                onClick={() => setView("onboarding")}
                className="w-full h-12 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-400/20 border-0 transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("login")}
                className="w-full h-11 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-2xl text-sm border border-slate-200 cursor-pointer transition-colors"
              >
                I already have an account
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-[10px] text-slate-400 font-mono uppercase tracking-wider">
        © {new Date().getFullYear()} AdrieChartered · Authorised & Regulated
      </footer>
    </div>
  );
}
