import { useApp } from "../context/AppContext.jsx";
import BrandLogo from "./BrandLogo.jsx";
import landingHero from "../assets/images/landing1.PNG";
import landingTrust from "../assets/images/landing2.JPG";

export default function LandingView() {
  const { setView } = useApp();

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      {/* Nav */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <BrandLogo className="h-10 w-auto object-contain" />
        <button
          onClick={() => setView("login")}
          className="text-sm font-medium text-slate-600 hover:text-[#4A90D9] bg-transparent border-0 cursor-pointer transition-colors"
        >
          Log in
        </button>
      </header>

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative w-full max-w-5xl mx-auto px-6 pb-16">
          <div className="relative rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[16/9] shadow-sm">
            <img
              src={landingHero}
              alt="AdrieChartered Bank headquarters"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 text-white">
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-white/70 mb-3">
                Established 1682
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-tight leading-tight max-w-xl">
                AdrieChartered Bank
              </h1>
              <p className="mt-3 text-base sm:text-lg text-white/85 font-light max-w-md">
                Fast, reliable banking — built around you.
              </p>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-3xl font-serif text-slate-900 leading-snug">
                Banking you can trust, at the speed you need.
              </h2>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                AdrieChartered is a modern UK bank offering secure accounts, instant transfers,
                and multi-currency support — online, anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setView("onboarding")}
                  className="h-12 px-8 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white text-sm font-semibold rounded-full cursor-pointer border-0 transition-colors"
                >
                  Open an account
                </button>
                <button
                  onClick={() => setView("login")}
                  className="h-12 px-8 bg-transparent hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-full cursor-pointer border border-slate-200 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <img
                src={landingTrust}
                alt="Trusted banking partnership"
                className="w-full max-w-sm object-contain"
              />
            </div>
          </div>
        </section>

        {/* Values — minimal strip */}
        <section className="border-t border-slate-100 bg-slate-50/50">
          <div className="w-full max-w-5xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-10 text-center sm:text-left">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#4A90D9] mb-2">Fast</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Instant transfers and real-time balance updates, wherever you are.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#4A90D9] mb-2">Reliable</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Secure accounts protected with industry-standard encryption and verification.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#4A90D9] mb-2">Personal</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Multi-currency support and a portal designed around how you bank.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 text-center text-xs text-slate-400 space-y-3">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setView("terms")}
            className="hover:text-[#4A90D9] bg-transparent border-0 cursor-pointer transition-colors"
          >
            Terms of Service
          </button>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => setView("privacy")}
            className="hover:text-[#4A90D9] bg-transparent border-0 cursor-pointer transition-colors"
          >
            Privacy Policy
          </button>
        </div>
        <p>© {new Date().getFullYear()} AdrieChartered Bank · Authorised & Regulated</p>
      </footer>
    </div>
  );
}
