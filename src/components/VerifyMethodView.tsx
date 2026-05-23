import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { OtpMethod } from "../types.js";
import { Mail, MessageSquare, Phone, ArrowRight, ArrowLeft, Loader, ShieldQuestion } from "lucide-react";

export default function VerifyMethodView() {
  const { tempUserId, sendOtp, setView } = useApp();
  
  const [method, setMethod] = useState<OtpMethod>("email");
  const [masks, setMasks] = useState({ email: "Loading...", phone: "Loading..." });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tempUserId) {
      setView("login");
      return;
    }

    // Retrieve security-masked destinations from the API
    const fetchMasks = async () => {
      try {
        const res = await fetch(`/api/auth/mask/${tempUserId}`);
        if (res.ok) {
          const data = await res.json();
          setMasks(data);
        } else {
          setError("Session expired. Please sign in again.");
        }
      } catch (err) {
        console.error("Failed to load destination details:", err);
        setError("Network error loading verification options.");
      }
    };

    fetchMasks();
  }, [tempUserId]);

  const handleContinue = async () => {
    if (!tempUserId) return;
    setIsSubmitting(true);
    setError("");
    try {
      await sendOtp(tempUserId, method);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-blue-200/40 border border-blue-100 p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4A90D9]" />

      <div className="flex flex-col items-center mb-6">
        <ShieldQuestion className="w-12 h-12 text-[#4A90D9] mb-3" />
        <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center">Verify Your Identity</h2>
        <p className="text-slate-500 text-xs text-center mt-1">Select your preferred two-step security delivery endpoint</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs font-medium text-rose-700 leading-snug mb-5">
          {error}
        </div>
      )}

      <div className="space-y-3.5 mb-6">
        {/* Method 1: Email */}
        <button
          type="button"
          onClick={() => setMethod("email")}
          className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer bg-white ${
            method === "email"
              ? "border-[#4A90D9] bg-blue-50/20"
              : "border-slate-100 hover:border-slate-300"
          }`}
          disabled={isSubmitting}
        >
          <div className={`p-2 rounded-lg shrink-0 ${method === "email" ? "bg-blue-150 text-[#4A90D9]" : "bg-slate-100 text-slate-500"}`}>
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send to my Email</h3>
            <p className="text-slate-400 text-[10px] mt-1">Standard SMTP Electronic notice</p>
            <p className="text-[#4A90D9] font-mono text-xs font-bold mt-1 tracking-wider">{masks.email}</p>
          </div>
        </button>

        {/* Method 2: WhatsApp */}
        <button
          type="button"
          onClick={() => setMethod("whatsapp")}
          className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer bg-white ${
            method === "whatsapp"
              ? "border-[#4A90D9] bg-blue-50/20"
              : "border-slate-100 hover:border-slate-300"
          }`}
          disabled={isSubmitting}
        >
          <div className={`p-2 rounded-lg shrink-0 ${method === "whatsapp" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send via WhatsApp</h3>
            <p className="text-slate-400 text-[10px] mt-1">Twilio WhatsApp business message</p>
            <p className="text-[#4A90D9] font-mono text-xs font-bold mt-1 tracking-wider">{masks.phone}</p>
          </div>
        </button>

        {/* Method 3: SMS */}
        <button
          type="button"
          onClick={() => setMethod("sms")}
          className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3.5 transition-all cursor-pointer bg-white ${
            method === "sms"
              ? "border-[#4A90D9] bg-blue-50/20"
              : "border-slate-100 hover:border-slate-300"
          }`}
          disabled={isSubmitting}
        >
          <div className={`p-2 rounded-lg shrink-0 ${method === "sms" ? "bg-[#e8f4fd] text-[#4A90D9]" : "bg-slate-100 text-slate-500"}`}>
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-grow">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Send via SMS</h3>
            <p className="text-slate-400 text-[10px] mt-1">Twilio cellular text notification</p>
            <p className="text-[#4A90D9] font-mono text-xs font-bold mt-1 tracking-wider">{masks.phone}</p>
          </div>
        </button>
      </div>

      <button
        onClick={handleContinue}
        disabled={isSubmitting}
        className="w-full h-11 bg-[#4A90D9] hover:bg-[#3b7fc7] disabled:bg-[#4A90D9]/50 text-white font-medium rounded-xl text-sm items-center justify-center flex gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.99]"
      >
        {isSubmitting ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Dispatched security code...</span>
          </>
        ) : (
          <>
            <span>Generate Security Code</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between">
        <button
          onClick={() => setView("login")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors bg-transparent border-0 cursor-pointer p-0"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </button>
      </div>
    </div>
  );
}
