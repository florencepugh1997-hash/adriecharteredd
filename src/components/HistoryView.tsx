import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { Transaction, CURRENCIES } from "../types.js";
import { Search, ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownLeft, FileText, Loader } from "lucide-react";

export default function HistoryView() {
  const { user, token } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [type, setType] = useState<"all" | "credit" | "debit">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Trigger search with debounce, or direct fetch on state changes
  const fetchLedger = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type,
        search,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/transactions?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Ledger query error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset page on filter/search change
  }, [type, search]);

  useEffect(() => {
    fetchLedger();
  }, [token, page, type, search]);

  if (!user) return null;

  const currentCurrency = CURRENCIES.find((c) => c.code === user.currency) || CURRENCIES[0];

  const totalPages = Math.ceil(total / limit) || 1;

  // Formatting date helper for listing
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date: dateFormatted, time: timeFormatted };
  };

  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
          <p className="text-xs text-slate-500">Full audit log of your incoming and outgoing electronic transfers</p>
        </div>

        {/* Filters and Search Bar in Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Credits vs Debits Segmented Controls */}
          <div className="bg-slate-100 rounded-xl p-0.5 flex">
            {(["all", "credit", "debit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                  type === t
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t === "all" ? "All" : t === "credit" ? "Credits" : "Debits"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-5 max-w-md">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#4A90D9] outline-none transition-all placeholder:text-slate-400"
          placeholder="Search by payee name, reference code, description..."
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Transaction Table / List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader className="w-8 h-8 animate-spin text-[#4A90D9]" />
          <span className="text-xs text-slate-400 font-medium">Interrogating security ledgers...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Transactions Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xs leading-normal">
            {search || type !== "all"
              ? "No records found matching your active keyword search or filter states."
              : "No transaction records are active on this account. Credit your account to begin."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 md:mx-0">
          <div className="inline-block min-w-full align-middle px-6 md:px-0">
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-55/75">
                  <tr>
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recipient / Sender</th>
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference / Desc</th>
                    <th className="py-3 px-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.map((tx) => {
                    const { date, time } = formatDateTime(tx.createdAt);
                    const txCurrency = CURRENCIES.find((c) => c.code === tx.currency) || currentCurrency;

                    return (
                      <tr 
                        key={tx._id} 
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Click to view full clearing receipt details"
                      >
                        {/* Type Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {tx.type === "credit" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-500 shrink-0" />
                              Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-widest">
                              <ArrowUpRight className="w-3 h-3 text-rose-500 shrink-0" />
                              Debit
                            </span>
                          )}
                        </td>

                        {/* Recipient Source info */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-900">
                            {tx.recipientName || (tx.type === "credit" ? "Direct Account Deposit" : "Direct Transfer")}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {tx.recipientBank || "External Clearing Node"} • {tx.recipientSortCode || "DIRECT"}
                            {tx.recipientAccount && tx.recipientAccount !== "Direct Node Sync" && tx.recipientAccount !== "Adrie Clearing System" && ` • ****${tx.recipientAccount.slice(-4)}`}
                          </div>
                        </td>

                        {/* DateTime */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                          <span className="font-semibold">{date}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">{time}</span>
                        </td>

                        {/* Reference / Desc */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-[10px] font-mono font-bold text-slate-500 select-all tracking-wider">
                            {tx.reference}
                          </div>
                          <div className="text-[11px] text-slate-450 truncate mt-0.5">
                            {tx.description}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <span
                            className={`font-mono font-bold text-xs ${
                              tx.type === "credit" ? "text-emerald-600" : "text-slate-800"
                            }`}
                          >
                            {tx.type === "credit" ? "+" : "-"}{txCurrency.symbol}
                            {tx.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Paginated Navigation Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 mt-6 pt-5">
          <p className="text-[11px] text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-700 font-mono">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-bold text-slate-700 font-mono">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-bold text-slate-700 font-mono">{total}</span> ledger logs
          </p>

          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors text-slate-600 cursor-pointer bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="h-9 px-3 border border-slate-100 bg-slate-50 flex items-center justify-center rounded-xl text-xs font-mono font-bold text-slate-700">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition-colors text-slate-600 cursor-pointer bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Transaction Details Modal Backdrop Pop-up overlay */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[32px] border border-blue-150 shadow-2xl p-6 md:p-8 max-w-sm w-full relative overflow-hidden">
            {/* Top colored aesthetic bar indicator based on credit/debit */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${selectedTx.type === 'credit' ? 'bg-emerald-500' : 'bg-[#4A90D9]'}`} />

            <button 
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer p-1 transition-colors outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Description */}
            <div className="flex flex-col items-center text-center mt-3 mb-5">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 ${selectedTx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#4A90D9]'}`}>
                {selectedTx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Clearing Receipt
              </h3>
              <p className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#4A90D9] mt-0.5">
                Cleared & Approved
              </p>
              
              <div className="mt-3">
                <span className={`text-2xl font-mono font-bold ${selectedTx.type === 'credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {selectedTx.type === 'credit' ? '+' : '-'}{(CURRENCIES.find(c => c.code === selectedTx.currency) || currentCurrency).symbol}
                  {selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Receipt Details Grid fields */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-2 text-[10px] font-sans">
              
              <div className="flex justify-between items-start">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Clearance Ref</span>
                <span className="font-mono font-bold text-slate-700 select-all uppercase">
                  {selectedTx.reference}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">{selectedTx.type === 'credit' ? 'Sender Name' : 'Recipient Name'}</span>
                <span className="font-bold text-slate-800">
                  {selectedTx.recipientName || (selectedTx.type === 'credit' ? 'Direct Account Deposit' : 'Direct Payee')}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">{selectedTx.type === 'credit' ? 'Depositing Bank' : 'Recipient Bank'}</span>
                <span className="font-semibold text-slate-700">
                  {selectedTx.recipientBank || 'External Clearing Bank'}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Transit Method</span>
                <span className="font-semibold font-mono text-slate-600">
                  {selectedTx.recipientSortCode || 'DIRECT'}
                </span>
              </div>

              {selectedTx.recipientAccount && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Account Reference</span>
                  <span className="font-bold font-mono text-slate-600">
                    {selectedTx.recipientAccount.length >= 10 && !isNaN(Number(selectedTx.recipientAccount)) ? `•••• ${selectedTx.recipientAccount.slice(-4)}` : selectedTx.recipientAccount}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Timestamp</span>
                <span className="font-medium text-slate-700 font-mono">
                  {new Date(selectedTx.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex justify-between items-start border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Description</span>
                <span className="font-semibold text-slate-800 max-w-[150px] text-right truncate">
                  {selectedTx.description || 'Clearing system transfer.'}
                </span>
              </div>

            </div>

            <div className="mt-5">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all border-0 shadow-lg"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
