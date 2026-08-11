import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import BrandLogo from "./BrandLogo.jsx";
import { Globe, ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Clock, Smartphone, Mail, Briefcase, Users, Ban, Unlock } from "lucide-react";

interface PendingApplicant {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  currency: string;
  accountNumber?: string;
  isEmailVerified?: boolean;
  createdAt: string;
}

interface ActiveAccount {
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  currency: string;
  accountNumber: string;
  balance: number;
  isBlocked?: boolean;
  blockedAt?: string;
  createdAt?: string;
}

type AdminTab = "pending" | "active";

export default function AdminView() {
  const { setView, showToast } = useApp();
  const [adminTab, setAdminTab] = useState<AdminTab>("pending");
  const [pendingList, setPendingList] = useState<PendingApplicant[]>([]);
  const [activeList, setActiveList] = useState<ActiveAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminName === "akonam" && adminPassword === "147963") {
      setAuthorized(true);
      setLoginError("");
      showToast?.("success", "Compliance Node authorized. Welcome Superintendent Akonam.");
      fetchPending();
      fetchActive();
    } else {
      setLoginError("Invalid compliance node clearance credentials.");
      showToast?.("error", "Clearance Failure: Invalid admin profile details.");
    }
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingList(data.pending || []);
      } else {
        showToast("error", "Failed to clear compliance register lookup.");
      }
    } catch (err: any) {
      showToast("error", "Connection error syncing registration queue.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActive = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/active-users");
      if (res.ok) {
        const data = await res.json();
        setActiveList(data.users || []);
      } else {
        showToast("error", "Failed to load active accounts.");
      }
    } catch {
      showToast("error", "Connection error syncing active accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      if (adminTab === "pending") fetchPending();
      else fetchActive();
    }
  }, [authorized, adminTab]);

  const handleApprove = async (id: string, name: string) => {
    try {
      showToast("info", `Initiating secure node audit for ${name}...`);
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("success", `Approved: ${name} is now active! Credentials dispatched.`);
        fetchPending();
      } else {
        showToast("error", data.error || "Failed to authorize profile.");
      }
    } catch (err) {
      showToast("error", "Secure ledger connection timeout.");
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to REJECT and PERMANENTLY CANCEL the application for ${name}?`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("success", `Application for ${name} has been rejected and cancelled.`);
        fetchPending();
      } else {
        showToast("error", data.error || "Failed to cancel request.");
      }
    } catch (err) {
      showToast("error", "Server communication interrupted.");
    }
  };

  const handleLeave = (name: string) => {
    showToast("info", `Compliance audit deferred for ${name}. Application remains queued.`);
  };

  const handleBlock = async (id: string, name: string) => {
    if (!window.confirm(`Temporarily block ${name}'s account? They will not be able to sign in until you unblock them.`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `${name} has been blocked.`);
        fetchActive();
      } else {
        showToast("error", data.error || "Failed to block account.");
      }
    } catch {
      showToast("error", "Server communication interrupted.");
    }
  };

  const handleUnblock = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/admin/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `${name} has been unblocked.`);
        fetchActive();
      } else {
        showToast("error", data.error || "Failed to unblock account.");
      }
    } catch {
      showToast("error", "Server communication interrupted.");
    }
  };

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-[#E8F4FD] font-sans text-slate-850">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-blue-100 p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
          
          <div className="flex flex-col items-center mb-6">
            <BrandLogo className="h-20 w-auto object-contain mb-4" alt="AdrieChartered Logo" />
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl font-bold text-slate-950 tracking-tight leading-none">Compliance Gateway</h1>
              <span className="text-[10px] text-[#4A90D9] font-mono tracking-widest uppercase mt-2 font-extrabold">Superintendent Portal</span>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 bg-rose-50 border border-rose-150 rounded-xl p-3 text-rose-600 text-[11px] font-semibold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Clearance Identifier</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] outline-none transition-all placeholder:text-slate-400 font-mono font-bold"
                placeholder="e.g. akonam"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Security Keycode</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#4A90D9] focus:ring-1 focus:ring-[#4A90D9] outline-none transition-all placeholder:text-slate-400 font-mono font-bold"
                placeholder="Clearance password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg transition-all border-0 focus:outline-none mt-2"
            >
              Verify Administrative Credentials
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              onClick={() => setView("login")}
              className="text-[11px] text-[#4A90D9] hover:text-[#3a7bbb] font-bold bg-transparent border-0 cursor-pointer p-0"
            >
              ← Back to Client Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Back to Client Terminal Button */}
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => setView("login")}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#4A90D9] bg-white px-4 py-2 rounded-xl shadow-xs border border-slate-200 cursor-pointer transition-all focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit Compliance Node
        </button>
        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Globe className="w-3 h-3 text-[#4A90D9] animate-pulse" />
          AdrieChartered Compliance Portal
        </span>
      </div>

      {/* Main Admin Card */}
      <div className="bg-white rounded-[32px] shadow-2xl border border-blue-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />
        
        {/* Banner/Header */}
        <div className="px-6 py-8 md:px-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-slate-800" />
              <span className="text-[10px] font-mono tracking-widest text-[#4A90D9] font-extrabold uppercase">
                Compliance Control Console
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-950 tracking-tight">
              Account Management
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">
              Review pending applications and manage active customer accounts. Blocking is temporary — you can unblock at any time.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAdminTab("pending")}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                adminTab === "pending"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Pending ({pendingList.filter((a) => a.isEmailVerified).length})
            </button>
            <button
              onClick={() => setAdminTab("active")}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                adminTab === "active"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Active ({activeList.length})
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="p-6 md:p-8">
          {adminTab === "pending" ? (
            <>
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-mono">Syncing private staging environment...</p>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No applicants awaiting approval</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Excellent work! There are no onboarding records presently outstanding in the compliance staging cluster. All registration streams are cleanly allocated.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-150">
              <table className="w-full border-collapse text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-extrabold tracking-wider text-slate-500 uppercase text-[9px]">
                    <th className="py-3 px-4">Prospective Applicant</th>
                    <th className="py-3 px-4">Contact Particulars</th>
                    <th className="py-3 px-4">Onboarding Preferences</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Cleared Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingList.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Name & ID */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold">
                            {app.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{app.fullName}</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-1 pl-9">
                          ID: {app._id}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{app.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{app.phone}</span>
                        </div>
                      </td>

                      {/* Onboarding Preferences */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-blue-50 text-[#4A90D9] px-2 py-0.5 rounded font-bold">
                            {app.currency} Account
                          </span>
                          {app.accountNumber ? (
                            <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold" title="Requested Custom Account Number">
                              No: {app.accountNumber}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-400">
                              Auto-Generate
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>Submitted {new Date(app.createdAt).toLocaleString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {app.isEmailVerified ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                            Ready to approve
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 px-2 py-1 rounded">
                            Awaiting OTP
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Approve Button */}
                          <button
                            onClick={() => handleApprove(app._id, app.fullName)}
                            disabled={!app.isEmailVerified}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-3 py-1.5 rounded-lg border-0 flex items-center gap-1 cursor-pointer transition-colors hover:shadow-md focus:outline-none disabled:cursor-not-allowed"
                            title={
                              app.isEmailVerified
                                ? "Approve and create user profile"
                                : "Applicant must verify email OTP before approval"
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          {/* Leave It Button */}
                          <button
                            onClick={() => handleLeave(app.fullName)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border-0 flex items-center gap-1 cursor-pointer transition-colors focus:outline-none"
                            title="Decline action right now and keep in queue"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                            Leave it
                          </button>

                          {/* Reject / Cancel Button */}
                          <button
                            onClick={() => handleReject(app._id, app.fullName)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3 py-1.5 rounded-lg border-0 flex items-center gap-1 cursor-pointer transition-colors focus:outline-none"
                            title="Deny registry and permanently purge application"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </>
          ) : (
            <>
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin" />
                  <p className="text-slate-400 text-xs font-mono">Loading active accounts...</p>
                </div>
              ) : activeList.length === 0 ? (
                <div className="py-16 text-center max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-dashed border-slate-200">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">No active accounts yet</h3>
                    <p className="text-xs text-slate-400 mt-1">Approved customers will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-150">
                  <table className="w-full border-collapse text-left font-sans text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 font-extrabold tracking-wider text-slate-500 uppercase text-[9px]">
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Account</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeList.map((acct) => (
                        <tr key={acct._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900">{acct.fullName}</div>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">{acct.currency}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-mono font-bold text-slate-800">{acct.accountNumber}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Balance: {acct.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="py-4 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{acct.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{acct.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {acct.isBlocked ? (
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 px-2 py-1 rounded">
                                Blocked
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                                Active
                              </span>
                            )}
                            {acct.isBlocked && acct.blockedAt && (
                              <div className="text-[9px] text-slate-400 mt-1 font-mono">
                                Since {new Date(acct.blockedAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {acct.isBlocked ? (
                              <button
                                onClick={() => handleUnblock(acct._id!, acct.fullName)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg border-0 flex items-center gap-1 cursor-pointer mx-auto transition-colors"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlock(acct._id!, acct.fullName)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3 py-1.5 rounded-lg border-0 flex items-center gap-1 cursor-pointer mx-auto transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Block
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
