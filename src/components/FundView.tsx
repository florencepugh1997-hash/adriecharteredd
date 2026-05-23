import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES } from "../types.js";
import { PlusCircle, Loader, X, ArrowRight, ShieldCheck, CreditCard, Landmark, Key, ArrowLeft, AlertTriangle } from "lucide-react";

interface FundViewProps {
  onSuccess: () => void;
  onCancel: () => void;
  isSecretPath?: boolean;
}

export default function FundView({ onSuccess, onCancel, isSecretPath = false }: FundViewProps) {
  const { user, fundAccount, addNotification } = useApp();
  
  // Form step tracking (1 = Details & IMF, 2 = PIN authorization)
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "card_payment">("bank_transfer");
  const [senderName, setSenderName] = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [imfCode, setImfCode] = useState("");
  const [pin, setPin] = useState("");

  // Card specific state variables
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const currentCurrency = CURRENCIES.find((c) => c.code === user.currency) || CURRENCIES[0];

  const handleStep1Proceed = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please provide a valid deposit amount greater than zero.");
      return;
    }

    if (paymentMethod === "card_payment") {
      if (!senderName.trim()) {
        setError("Please enter the cardholder name.");
        return;
      }
      if (!senderBank.trim()) {
        setError("Please enter the card issuing bank name.");
        return;
      }
      const cleanNum = cardNumber.replace(/\s+/g, "");
      if (cleanNum.length !== 16 || isNaN(Number(cleanNum))) {
        setError("Please enter a valid 16-digit Card Number.");
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setError("Please enter card expiry in MM/YY format.");
        return;
      }
      if (cardCvv.length !== 3 || isNaN(Number(cardCvv))) {
        setError("Please enter a valid 3-digit CVV security code.");
        return;
      }
    } else {
      if (!senderName.trim()) {
        setError("Please enter your full depositor name.");
        return;
      }
      if (!senderBank.trim()) {
        setError("Please enter the originating bank name.");
        return;
      }
    }

    if (imfCode.trim() !== "82") {
      setError("Authorization Failed: Invalid or missing IMF Code (2 digits required).");
      return;
    }

    // Pass validations, proceed to PIN check
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.trim() !== "4867") {
      setError("Security PIN verification failed: Incorrect transaction PIN code.");
      return;
    }

    // Now check if it's the hidden successful path or the standard failing path
    if (!isSecretPath) {
      const errMsg = "System Outage: The bank is currently having technical issues and they are fixing it. Your transaction has been logged, but you cannot be credited now. Please contact support or try a different clearance node.";
      setError(errMsg);
      const detailMsg = `A deposit of ${currentCurrency.symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} has FAILED. Sender: ${senderName} (${senderBank}). Method: ${paymentMethod === "card_payment" ? "Card Payment" : "Bank Transfer"}. Error: Primary clearing node outage, transaction queued for recovery.`;
      addNotification("failed", `Failed Deposit - ${paymentMethod === "card_payment" ? "Card Payment" : "Bank Transfer"}`, detailMsg);
      return;
    }

    // Secret successful path!
    setIsSubmitting(true);
    try {
      const numAmount = Number(amount);
      const desc = description.trim() || `Electronic Deposit via ${paymentMethod === "bank_transfer" ? "Bank Transfer" : "Card Payment"} (${senderBank})`;
      await fundAccount(numAmount, desc, {
        senderName: senderName.trim(),
        senderBank: senderBank.trim(),
        senderAccount: paymentMethod === "card_payment" ? cardNumber.replace(/\s+/g, "") : "Direct Node Sync",
        paymentMethod: paymentMethod === "card_payment" ? "CARD" : "BANK TRANSFER",
      });
      addNotification("success", "Cleared Funds Received", `A deposit of ${currentCurrency.symbol}${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been cleared and credited from ${senderBank} (Sender: ${senderName}). Direct transfer cleared immediately.`);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Outward ingestion connection refused by central clearance nodes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-blue-150 shadow-xl p-7 max-w-md w-full relative overflow-hidden">
      
      {/* Decorative top header accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#4A90D9]" />

      <button 
        onClick={onCancel}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1 transition-colors"
        disabled={isSubmitting}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header section based on step */}
      <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#4A90D9] shrink-0 font-bold">
          {step === 1 ? <Landmark className="w-5 h-5" /> : <Key className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {step === 1 ? "Secure Deposit Request" : "Transaction Authorization"}
          </h3>
          <p className="text-[10px] text-slate-500 font-mono">
            {step === 1 ? "Step 1 of 2: Origin & Cleared Code" : "Step 2 of 2: Security PIN Verification"}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-150 rounded-2xl text-xs font-semibold text-rose-700 leading-normal flex gap-2.5 items-start">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        /* STEP 1: DEPOSIT DETAILS, PAYMENT METHOD, AND IMF CODE */
        <form onSubmit={handleStep1Proceed} className="space-y-4">
          
          {/* Method of payment selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Class</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("bank_transfer")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === "bank_transfer"
                    ? "bg-[#E8F4FD] border-[#4A90D9] text-[#4A90D9] shadow-sm shadow-blue-100"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Bank Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card_payment")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  paymentMethod === "card_payment"
                    ? "bg-[#E8F4FD] border-[#4A90D9] text-[#4A90D9] shadow-sm shadow-blue-100"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card Payment</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {paymentMethod === "card_payment" ? "Cardholder Name" : "Your Full Name"}
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-4.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                placeholder={paymentMethod === "card_payment" ? "e.g. Florence Pugh" : "Sender legal name"}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {paymentMethod === "card_payment" ? "Card Issuer Bank" : "Your Bank Name"}
              </label>
              <input
                type="text"
                value={senderBank}
                onChange={(e) => setSenderBank(e.target.value)}
                className="w-full px-4.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                placeholder={paymentMethod === "card_payment" ? "e.g. Barclays Bank" : "Originating Bank"}
                required
              />
            </div>
          </div>

          {paymentMethod === "card_payment" && (
            <div className="space-y-4 pt-1 animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      const matches = v.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || "";
                      const parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(" "));
                      } else {
                        setCardNumber(v);
                      }
                    }}
                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                    placeholder="4000 1234 5678 9010"
                    required
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "");
                      if (v.length >= 2) {
                        setCardExpiry(`${v.slice(0, 2)}/${v.slice(2, 4)}`);
                      } else {
                        setCardExpiry(v);
                      }
                    }}
                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                    placeholder="MM/YY"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CVV / CVC Code</label>
                  <input
                    type="password"
                    maxLength={3}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                    placeholder="•••"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-8">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount ({user.currency})</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                  {currentCurrency.symbol}
                </span>
                <input
                  type="text"
                  pattern="^[0-9]+(\.[0-9]{1,2})?$"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-[#4A90D9] outline-none transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">IMF Code</label>
              <input
                type="text"
                maxLength={2}
                value={imfCode}
                onChange={(e) => setImfCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3 text-center h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold tracking-widest focus:bg-white focus:border-[#4A90D9] outline-none transition-all"
                placeholder="##"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Deposit Reference (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
              placeholder="e.g. Savings account transfer, Direct credit"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-grow h-10 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-xs transition-all cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-grow h-10 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white font-semibold rounded-xl text-xs items-center justify-center flex gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              <span>Proceed to Authorize</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      ) : (
        /* STEP 2: ENTER PIN TO COMPLETE TRANSACTION */
        <form onSubmit={handleStep2Submit} className="space-y-5 animate-fade-in">
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Clearance Node Connected</p>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                Your deposit request of <span className="font-mono font-extrabold text-blue-700">{currentCurrency.symbol}{Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span> from originating bank <span className="font-bold text-blue-700">{senderBank}</span> has been staged. Enter your 4-digit card/security PIN to finalize.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Enter 4-Digit Security PIN</label>
            <div className="max-w-[160px] mx-auto relative">
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center h-12 bg-slate-50 border border-slate-300 rounded-2xl text-2xl font-mono tracking-widest font-bold focus:bg-white focus:border-[#4A90D9] outline-none transition-all"
                placeholder="••••"
                required
                autoFocus
                disabled={isSubmitting}
              />
              <span className="block text-[9px] text-slate-400 text-center font-mono mt-1 w-full">Card holder numeric pin</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              className="w-24 h-10 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer bg-white"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="flex-1 h-10 bg-[#4A90D9] hover:bg-[#3b7fc7] disabled:bg-[#4A90D9]/50 text-white font-semibold rounded-xl text-xs items-center justify-center flex gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>Clearing Funds...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Deposit</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
