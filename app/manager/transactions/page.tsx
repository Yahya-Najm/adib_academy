"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
} from "../actions/transactions";

type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];

const CATEGORY_PRESETS = ["Electricity", "Supplies", "Maintenance", "Rent", "Salaries", "Other"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = { trackingNumber: "", category: "", description: "", amount: "", transactionDate: today() };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const data = await getTransactions(search || undefined);
    setTransactions(data);
  }

  useEffect(() => { load(); }, [search]);

  function openCreate() {
    setEditItem(null);
    setForm({ ...emptyForm });
    setError("");
    setShowForm(true);
  }

  function openEdit(t: Transaction) {
    setEditItem(t);
    setForm({
      trackingNumber: t.trackingNumber ?? "",
      category: t.category,
      description: t.description ?? "",
      amount: String(t.amount),
      transactionDate: new Date(t.transactionDate).toISOString().slice(0, 10),
    });
    setError("");
    setShowForm(false);
  }

  function handleSubmit() {
    setError("");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setError("Amount must be a positive number"); return; }

    startTransition(async () => {
      try {
        if (editItem) {
          await updateTransaction(editItem.id, {
            category: form.category,
            description: form.description || undefined,
            amount,
            transactionDate: form.transactionDate,
          });
          setEditItem(null);
        } else {
          await createTransaction({
            trackingNumber: form.trackingNumber,
            category: form.category,
            description: form.description || undefined,
            amount,
            transactionDate: form.transactionDate,
          });
          setShowForm(false);
        }
        setForm({ ...emptyForm });
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save transaction");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        setConfirmId(null);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  const isEditing = !!editItem;
  const showInlineForm = showForm || isEditing;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Record and track branch expenses</p>
        </div>
        <button
          onClick={() => { if (isEditing) { setEditItem(null); } else { showForm ? setShowForm(false) : openCreate(); } }}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm || isEditing ? "Cancel" : "+ Record Transaction"}
        </button>
      </div>

      {/* Form */}
      {showInlineForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </h2>
          {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            {!isEditing && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tracking Number *</label>
                <input
                  type="text"
                  value={form.trackingNumber}
                  onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                  placeholder="e.g. TXN-2024-001"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category *</label>
              <input
                type="text"
                list="category-presets"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Select or type..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <datalist id="category-presets">
                {CATEGORY_PRESETS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transaction Date *</label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={e => setForm(f => ({ ...f, transactionDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={isPending}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Record Transaction"}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError(""); }}
              className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Transaction</h3>
            <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(confirmId)} disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by tracking #, category, or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Table */}
      {transactions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No transactions recorded yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Tracking #", "Category", "Amount", "Description", "Transaction Date", "Recorded At", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{t.trackingNumber}</td>
                  <td className="px-5 py-3 text-gray-800 font-medium">{t.category}</td>
                  <td className="px-5 py-3 text-gray-800">${t.amount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-500">{t.description ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(t.transactionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    <span className="ml-1 text-gray-300">by {t.recordedBy.name}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(t)}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button onClick={() => setConfirmId(t.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
