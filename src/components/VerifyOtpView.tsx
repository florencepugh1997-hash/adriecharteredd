import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import { KeyRound, ArrowLeft, RotateCcw, Loader, AlertCircle } from "lucide-react";

export default function VerifyOtpView() {
  const { tempUserId, verifyOtp, resendOtp, setView } = useApp();
  
  const [otpVals, setOtpVals] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!tempUserId) {
      setView("login");
      return;
    }
  }, [tempUserId]);

  // Handle countdown Timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus helper onmount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;

    setError("");
    const newOtp = [...otpVals];
    newOtp[index] = value;
    setOtpVals(newOtp);

    // Auto-focus next box
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all digits are typed
    if (newOtp.every((char) => char !== "")) {
      const fullCode = newOtp.join("");
      triggerVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const currentVal = otpVals[index];
      
      // If current is empty, clear previous and focus previous
      if (currentVal === "" && index > 0) {
        const newOtp = [...otpVals];
        newOtp[index - 1] = "";
        setOtpVals(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Just clear current
        const newOtp = [...otpVals];
        newOtp[index] = "";
        setOtpVals(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const digits = pastedData.split("");
    setOtpVals(digits);
    triggerVerification(pastedData);
  };

  const triggerVerification = async (code: string) => {
    if (!tempUserId) return;
    setIsSubmitting(true);
    setError("");
    try {
      await verifyOtp(tempUserId, code);
    } catch (err: any) {
      setError(err.message || "Failed to approve verification code.");
      // Focus first digit box and clear entries on error
      setOtpVals(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!tempUserId || countdown > 0) return;
    setError("");
    try {
      await resendOtp(tempUserId);
      setCountdown(60);
      setOtpVals(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to trigger resend.");
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-blue-200/40 border border-blue-100 p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4A90D9]" />

      <div className="flex flex-col items-center mb-6">
        <KeyRound className="w-12 h-12 text-[#4A90D9] mb-3" />
        <h2 className="text-xl font-bold text-slate-900 tracking-tight text-center">Security Verification</h2>
        <p className="text-slate-500 text-xs text-center mt-1 leading-snug">
          We sent a 6-digit verification code to your chosen delivery channel. Please enter it below.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs font-semibold text-rose-700 leading-snug flex items-start gap-2 mb-5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between gap-2.5 mb-8">
        {otpVals.map((val, index) => (
          <input
            key={index}
            type="text"
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            value={val}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-12 h-14 border-2 rounded-xl text-center font-mono font-bold text-xl text-slate-900 outline-none transition-all focus:border-[#4A90D9] bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-blue-100"
            disabled={isSubmitting}
            maxLength={1}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        ))}
      </div>

      <div className="space-y-4">
        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 py-1.5 bg-slate-50 rounded-lg">
            <Loader className="w-3.5 h-3.5 animate-spin text-[#4A90D9]" />
            <span>Validating security clearance metrics...</span>
          </div>
        )}

        {/* Resend Actions */}
        <div className="text-center pt-2">
          {countdown > 0 ? (
            <p className="text-xs text-slate-400 font-medium">
              You can request a new code in <span className="text-slate-700 font-mono font-bold">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 text-xs text-[#4A90D9] hover:text-[#3b7fc7] font-semibold bg-transparent border-0 cursor-pointer p-0 select-none hover:underline"
              disabled={isSubmitting}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resend Token Code</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => setView("verify-method")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors bg-transparent border-0 cursor-pointer p-0"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change delivery method</span>
        </button>
        <span className="text-[10px] text-slate-400 font-mono">ID verification stage</span>
      </div>
    </div>
  );
}
