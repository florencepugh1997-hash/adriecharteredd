import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { BANKS, CURRENCIES } from "../types.js";
import { Send, Loader, ArrowRight, CheckCircle, Smartphone, MessageSquare, Plus, RefreshCw, X } from "lucide-react";

interface TransferViewProps {
  onSuccessClose?: () => void;
}

export default function TransferView({ onSuccessClose }: TransferViewProps) {
  const { user, transferFunds } = useApp();

  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientSortCode, setRecipientSortCode] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [imfCode, setImfCode] = useState("");
  const [pin, setPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState({ reference: "", alertMessage: "" });

  if (!user) return null;

  const currentCurrency = CURRENCIES.find((c) => c.code === user.currency) || CURRENCIES[0];

  // Auto formats sort code as XX-XX-XX
  const handleSortCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2)}`;
    } else if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
    }
    setRecipientSortCode(formatted);
  };

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setRecipientAccount(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = Number(amount);

    if (recipientAccount.length < 8) {
      setError("UK Bank Account digits are structurally 8 to 10 digits.");
      return;
    }

    if (recipientSortCode.length < 8) {
      setError("Sort Code must be formatted as XX-XX-XX.");
      return;
    }

    if (!recipientBank) {
      setError("Please select the recipient's institution bank.");
      return;
    }

    if (!recipientName) {
      setError("Please provide the recipient's payee name.");
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid outward payment amount.");
      return;
    }

    if (user.balance < numAmount) {
      setError(`Sufficient funds unavailable. Current balance: ${currentCurrency.symbol}${user.balance.toLocaleString("en-GB", { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (imfCode.trim() !== "82") {
      setError("Authorization Failed: Invalid or missing IMF Code (2 digits required).");
      return;
    }

    if (pin.trim() !== "4867") {
      setError("Security PIN verification failed: Incorrect transaction PIN code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await transferFunds({
        recipientAccount,
        recipientSortCode,
        recipientBank,
        recipientName,
        amount: numAmount,
        description: description || "FPS Outward electronic transfer",
      });

      setReceiptDetails(resp);
      setShowReceipt(true);
      
      // Reset inputs
      setRecipientAccount("");
      setRecipientSortCode("");
      setRecipientBank("");
      setRecipientName("");
      setAmount("");
      setDescription("");
      setImfCode("");
      setPin("");
    } catch (err: any) {
      setError(err.message || "Outward payment transfer was declined by bank nodes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-fill trigger share messages
  const encodedShareText = encodeURIComponent(receiptDetails.alertMessage);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Receipt Success Overlay Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/45 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-[32px] w-full max-w-md p-7 relative shadow-2xl border border-slate-150">
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="w-14 h-14 text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Payment Completed</h3>
              <p className="text-slate-500 text-xs">Funds dispatched immediately via faster payment service nodes</p>
            </div>

            <div className="my-5 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="block text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-1">Receipt Content</span>
              <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                {receiptDetails.alertMessage}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* WhatsApp Share Hook */}
              <a
                href={`https://wa.me/?text=${encodedShareText}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold select-none shadow-md shadow-emerald-500/10 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </a>

              {/* SMS Share Hook */}
              <a
                href={`sms:?&body=${encodedShareText}`}
                className="flex items-center justify-center gap-2 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold select-none shadow-md shadow-blue-500/10 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>Send via SMS</span>
              </a>
            </div>

            <button
              onClick={() => {
                setShowReceipt(false);
                if (onSuccessClose) onSuccessClose();
              }}
              className="w-full h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs transition-colors cursor-pointer bg-white"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Main Send Form */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8 relative">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-150">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pay & Transfer Funds</h2>
            <p className="text-xs text-slate-500">Real-time bank transfers within the United Kingdom banking grid</p>
          </div>
          <span className="px-3 py-1 bg-sky-50 text-sky-700 text-[10px] font-mono font-bold rounded-full tracking-wider border border-sky-100">
            FPS-READY
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs font-medium text-rose-700 leading-snug mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Full Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                placeholder="Payee full legal name"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Bank Name</label>
              <select
                value={recipientBank}
                onChange={(e) => setRecipientBank(e.target.value)}
                className="w-full px-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] outline-none cursor-pointer"
                disabled={isSubmitting}
                required
              >
                <option value="">-- Select UK Institution --</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sort Code</label>
              <input
                type="text"
                value={recipientSortCode}
                onChange={handleSortCodeChange}
                className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-450 font-mono tracking-widest"
                placeholder="40-22-15"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Number</label>
              <input
                type="text"
                value={recipientAccount}
                onChange={handleAccountChange}
                className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-450 font-mono tracking-widest"
                placeholder="10-digit account digits"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
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
                  className="w-full pl-9 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-350"
                  placeholder="0.00"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description / Payment Reference</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 h-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
                placeholder="e.g. Invoice #212, Split dinner"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Security Clearance Credentials</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">IMF Code (2 Digits)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={imfCode}
                  onChange={(e) => setImfCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="IMF Code Required"
                  disabled={isSubmitting}
                  className="w-full px-4 h-10 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:border-[#4A90D9] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Personal Card/Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="4-digit Security PIN"
                  disabled={isSubmitting}
                  className="w-full px-4 h-10 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest focus:border-[#4A90D9] outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="h-11 px-8 bg-[#4A90D9] hover:bg-[#3b7fc7] disabled:bg-[#4A90D9]/50 text-white font-medium rounded-xl text-sm items-center justify-center flex gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/15"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Clearing Payment Node...</span>
                </>
              ) : (
                <>
                  <span>Send Money Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
