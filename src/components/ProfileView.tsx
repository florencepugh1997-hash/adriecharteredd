import { useState, useRef, type ChangeEvent } from "react";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, CurrencyCode } from "../types.js";
import UserAvatar from "./UserAvatar.jsx";
import { Copy, Check, LogOut, Globe, User, ShieldCheck, Mail, Phone, Calendar, ChevronRight, X, Camera } from "lucide-react";

export default function ProfileView() {
  const { user, updateCurrency, updateProfilePhoto, logout } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  if (!user) return null;

  const activeCurrency = CURRENCIES.find((c) => c.code === user.currency) || CURRENCIES[0];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const formatJoinedDate = (isoStr?: string) => {
    if (!isoStr) return "22/05/2026";
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const selectCurrency = async (code: CurrencyCode) => {
    await updateCurrency(code);
    setShowCurrencyModal(false);
  };

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }

    const compressed = await compressProfileImage(file);
    await updateProfilePhoto(compressed);
    e.target.value = "";
  };

  const compressProfileImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSize = 320;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not process image."));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => reject(new Error("Could not load image."));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = async () => {
    await updateProfilePhoto(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Dynamic Currency Update Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-slate-900/45 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-7 relative shadow-2xl border border-slate-150 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowCurrencyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-5 h-5 text-[#4A90D9]" />
                Preferred display currency
              </h3>
              <p className="text-xs text-slate-500 mt-1">Select your preferred default currency format for balances and transfers.</p>
            </div>

            {/* Scrolling Currency Grid List, NO African Currencies */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2 no-scrollbar border-y border-slate-100 py-3">
              {CURRENCIES.map((desc) => (
                <button
                  key={desc.code}
                  onClick={() => selectCurrency(desc.code)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-colors cursor-pointer bg-white ${
                    user.currency === desc.code
                      ? "border-[#4A90D9] bg-blue-50/15"
                      : "border-slate-50 hover:border-slate-250 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" role="img" aria-label={desc.name}>
                      {desc.flag}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 tracking-wide font-mono mr-1.5">{desc.code}</span>
                      <span className="text-xs text-slate-500">{desc.name}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#4A90D9] bg-blue-50 px-2.5 py-1 rounded-lg">
                    {desc.symbol}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-1 flex justify-end">
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="px-6 h-10 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-xs transition-colors cursor-pointer bg-white"
              >
                Close list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        {/* AdrieChartered layout stripe header */}
        <div className="h-28 bg-[#4A90D9]/15 flex items-end justify-between p-6 relative">
          <div className="relative mt-8 group">
            <UserAvatar user={user} className="w-20 h-20" textClassName="text-2xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer"
              title="Change profile photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          <span className="px-3 py-1 bg-[#4A90D9]/10 text-[#4A90D9] font-mono text-[9px] font-bold rounded-lg border border-[#4A90D9]/20 self-start">
            SECURE ACCESS
          </span>
        </div>

        <div className="p-6 md:p-8 pt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user.fullName}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                Verified Online Customer Account
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
              onClick={logout}
              className="px-4 h-10 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
            {user.profilePhoto && (
              <button
                onClick={handleRemovePhoto}
                className="px-3 h-10 text-slate-500 hover:text-slate-700 font-medium rounded-xl text-xs border border-slate-200 bg-white cursor-pointer"
              >
                Remove photo
              </button>
            )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> General details
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Support Endpoint</span>
                  <span className="text-xs font-semibold text-slate-800">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number Target</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{user.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Member Since</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {formatJoinedDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Card / Identifiers */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Identifiers & Copy
              </h3>

              {/* Account Number Card Component */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">AdrieChartered Acc No</span>
                  <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                    {user.accountNumber}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(user.accountNumber, "acc")}
                  className="w-9 h-9 hover:bg-white border-0 hover:border border-slate-150 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all cursor-pointer bg-transparent"
                >
                  {copiedField === "acc" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Sort Code Card Component */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">AdrieChartered Sort Code</span>
                  <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">
                    {user.sortCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(user.sortCode, "sort")}
                  className="w-9 h-9 hover:bg-white border-0 hover:border border-slate-150 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all cursor-pointer bg-transparent"
                >
                  {copiedField === "sort" ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Preferences update block */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100/70 flex items-center justify-center text-[#4A90D9] shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Preferred Currency</h3>
            </div>
          </div>

          <button
            onClick={() => setShowCurrencyModal(true)}
            className="px-4 h-10 bg-[#4A90D9] hover:bg-[#3b7fc7] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
          >
            <span>Change ({user.currency})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 p-4 rounded-xl border-2 border-dashed border-blue-100 bg-sky-50/15 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">Currently selected currency</span>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span className="text-lg">{activeCurrency.flag}</span>
            <span>
              {activeCurrency.code} — {activeCurrency.name} ({activeCurrency.symbol})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
