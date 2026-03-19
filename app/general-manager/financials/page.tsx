"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getGMBranches,
  getGMFinancialSummary,
  getGMTransactionLedger,
} from "../actions/financials";
import { SOURCE_LABELS, SOURCE_ORDER } from "@/lib/financialConstants";

type Branches = Awaited<ReturnType<typeof getGMBranches>>;
type Summary = Awaited<ReturnType<typeof getGMFinancialSummary>>;
type Ledger = Awaited<ReturnType<typeof getGMTransactionLedger>>;

type Preset = "today" | "week" | "month" | "custom";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff));
}
function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SOURCE_TYPES = ["ALL", ...SOURCE_ORDER];

export default function GMFinancialsPage() {
  const today = new Date();
  const [branches, setBranches] = useState<Branches>([]);
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(toInputDate(today));
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ledger, setLedger] = useState<Ledger>([]);
  const [isPending, startTransition] = useTransition();

  function getDateRange(): { from: string; to: string } {
    const now = new Date();
    if (preset === "today") {
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    }
    if (preset === "week") {
      return { from: startOfWeek(now).toISOString(), to: endOfDay(now).toISOString() };
    }
    if (preset === "month") {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    return {
      from: startOfDay(new Date(customFrom)).toISOString(),
      to: endOfDay(new Date(customTo)).toISOString(),
    };
  }

  function load() {
    const { from, to } = getDateRange();
    const bId = branchFilter === "ALL" ? undefined : branchFilter;
    const sType = sourceFilter === "ALL" ? undefined : sourceFilter;
    startTransition(async () => {
      const [s, l] = await Promise.all([
        getGMFinancialSummary(from, to, bId, sType),
        getGMTransactionLedger(from, to, bId, sType),
      ]);
      setSummary(s);
      setLedger(l);
    });
  }

  useEffect(() => {
    getGMBranches().then(setBranches);
  }, []);

  useEffect(() => { load(); }, [preset, branchFilter, sourceFilter]);

  const profitColor = !summary ? "text-gray-900"
    : summary.netProfit >= 0 ? "text-orange-700" : "text-red-700";
  const profitBg = !summary ? "bg-white"
    : summary.netProfit >= 0 ? "bg-orange-50" : "bg-red-50";
  const profitBorder = !summary ? "border-gray-200"
    : summary.netProfit >= 0 ? "border-orange-200" : "border-red-200";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Financials</h1>
      <p className="text-gray-500 text-sm mb-6">Cross-branch income, expenses, and net profit</p>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        {/* Branch selector */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Branch</p>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="ALL">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Date presets */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Date Range</p>
          <div className="flex gap-1">
            {(["today","week","month","custom"] as Preset[]).map(p => (
              <button key={p} onClick={() => setPreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  preset === p
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-400"
                }`}>
                {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}
              </button>
            ))}
          </div>
        </div>

        {preset === "custom" && (
          <div className="flex gap-2 items-end">
            <div>
              <p className="text-xs text-gray-500 mb-1">From</p>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">To</p>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <button onClick={load}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              Apply
            </button>
          </div>
        )}

        <div className="ml-auto">
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Source</p>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            {SOURCE_TYPES.map(s => (
              <option key={s} value={s}>{s === "ALL" ? "All Sources" : SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Total Income</p>
          <p className="text-2xl font-bold text-green-700">
            {isPending ? "—" : fmtMoney(summary?.totalIncome ?? 0)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {branchFilter === "ALL" ? "All branches" : branches.find(b => b.id === branchFilter)?.name}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-red-700">
            {isPending ? "—" : fmtMoney(summary?.totalExpenses ?? 0)}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {branchFilter === "ALL" ? "All branches" : branches.find(b => b.id === branchFilter)?.name}
          </p>
        </div>
        <div className={`${profitBg} border ${profitBorder} rounded-xl p-5 shadow-sm`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${profitColor}`}>Net Profit</p>
          <p className={`text-2xl font-bold ${profitColor}`}>
            {isPending ? "—" : fmtMoney(summary?.netProfit ?? 0)}
          </p>
          <p className={`text-xs mt-1 ${profitColor}`}>
            {summary ? (summary.netProfit >= 0 ? "Surplus" : "Deficit") : ""}
          </p>
        </div>
      </div>

      {/* Per-branch breakdown (all branches only) */}
      {branchFilter === "ALL" && summary && summary.branchSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Per-Branch Summary</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.branchSummary.map(b => {
                const profit = b.income - b.expenses;
                return (
                  <tr key={b.name} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{b.name}</td>
                    <td className="px-5 py-3 text-right text-green-700 font-medium">{fmtMoney(b.income)}</td>
                    <td className="px-5 py-3 text-right text-red-700 font-medium">{fmtMoney(b.expenses)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${profit >= 0 ? "text-orange-700" : "text-red-700"}`}>
                      {profit >= 0 ? "+" : "−"}{fmtMoney(Math.abs(profit))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Breakdown by source */}
      {summary && Object.keys(summary.breakdown).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Breakdown by Source</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SOURCE_ORDER.filter(s => summary.breakdown[s]).map(s => {
                const { amount, type } = summary.breakdown[s];
                return (
                  <tr key={s} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{SOURCE_LABELS[s]}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        type === "INCOME" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {type === "INCOME" ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-right font-semibold ${
                      type === "INCOME" ? "text-green-700" : "text-red-700"
                    }`}>
                      {type === "INCOME" ? "+" : "−"}{fmtMoney(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Ledger */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-700">Transaction Ledger</h2>
          <span className="text-xs text-gray-400">{ledger.length} entries</span>
        </div>
        {isPending ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : ledger.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No transactions in this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Date", "Branch", "Description", "Source", "Recorded By", "Amount"].map(h => (
                  <th key={h} className={`px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Amount" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledger.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(t.transactionDate)}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      {t.branch.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-800 max-w-xs">
                    <p className="font-medium truncate">{t.description || t.category}</p>
                    {t.description && <p className="text-xs text-gray-400 truncate">{t.category}</p>}
                    {t.trackingNumber && <p className="text-xs text-gray-400">#{t.trackingNumber}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {SOURCE_LABELS[t.sourceType] ?? t.sourceType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.recordedBy.name}</td>
                  <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${
                    t.type === "INCOME" ? "text-green-700" : "text-red-700"
                  }`}>
                    {t.type === "INCOME" ? "+" : "−"}{fmtMoney(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
