import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import BrandLogo from "./BrandLogo.jsx";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  const { setView } = useApp();

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      <header className="w-full max-w-3xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-100">
        <BrandLogo className="h-9 w-auto object-contain" />
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#4A90D9] bg-transparent border-0 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </header>

      <main className="flex-grow w-full max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400 mt-2 mb-8">Last updated: {lastUpdated}</p>
        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">{children}</div>
        <div className="mt-10 pt-6 border-t border-slate-100 flex gap-4 text-xs">
          <button
            onClick={() => setView("terms")}
            className="text-[#4A90D9] hover:underline bg-transparent border-0 cursor-pointer p-0"
          >
            Terms of Service
          </button>
          <button
            onClick={() => setView("privacy")}
            className="text-[#4A90D9] hover:underline bg-transparent border-0 cursor-pointer p-0"
          >
            Privacy Policy
          </button>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} AdrieChartered Bank · Authorised & Regulated
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-slate-900 mb-2">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export { Section };
