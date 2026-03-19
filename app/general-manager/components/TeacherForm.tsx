"use client";

import { useMemo, useState } from "react";
import { createTeacher, updateTeacher } from "../actions/teachers";

interface Branch { id: string; name: string; }

interface InitialTeacher {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  branchId: string | null;
  paymentType: string | null;
  perClassRate: number | null;
  revenuePercentage: number | null;
  hourlyRate: number | null;
}

interface Props {
  branches: Branch[];
  initial?: InitialTeacher;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function TeacherForm({ branches, initial, onSuccess, onCancel }: Props) {
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    password: "",
    branchId: initial?.branchId ?? "",
    paymentType: initial?.paymentType ?? "PER_CLASS",
    perClassRate: initial?.perClassRate?.toString() ?? "",
    revenuePercentage: initial?.revenuePercentage?.toString() ?? "",
    hourlyRate: initial?.hourlyRate?.toString() ?? "",
    active: initial?.active ?? true,
  });
  const [idSuffix] = useState(() => Math.random().toString(16).slice(2, 6));
  const idPreview = useMemo(() => {
    const parts = form.name.trim().toLowerCase().split(/\s+/);
    const base = parts.slice(0, 2).join("-").replace(/[^a-z0-9-]/g, "");
    return base ? `${base}-${idSuffix}` : "";
  }, [form.name, idSuffix]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function field<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (editing) {
        await updateTeacher(initial.id, form.name, form.email, form.branchId, form.paymentType, form.perClassRate, form.revenuePercentage, form.hourlyRate, form.active, form.password || undefined);
      } else {
        await createTeacher(form.name, form.email, form.password, form.branchId, form.paymentType, form.perClassRate, form.revenuePercentage, form.hourlyRate);
        setForm({ name: "", email: "", password: "", branchId: "", paymentType: "PER_CLASS", perClassRate: "", revenuePercentage: "", hourlyRate: "", active: true });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save teacher");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-md">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{editing ? "Edit Teacher" : "New Teacher"}</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
          <input
            type="text" value={form.name} onChange={e => field("name", e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
          {!editing && idPreview && (
            <p className="mt-1 text-xs text-gray-400">
              ID preview: <span className="font-mono text-gray-600">{idPreview}</span>
              <span className="ml-1 text-gray-400">(suffix changes on save)</span>
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
          <input
            type="email" value={form.email} onChange={e => field("email", e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {editing ? "New Password (leave blank to keep current)" : "Password *"}
          </label>
          <input
            type="password" value={form.password} onChange={e => field("password", e.target.value)}
            required={!editing}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
          <select
            value={form.branchId} onChange={e => field("branchId", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">No branch assigned</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type *</label>
          <select
            value={form.paymentType} onChange={e => field("paymentType", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="PER_CLASS">Per Section — fixed rate per section taught</option>
            <option value="REVENUE_PERCENTAGE">Revenue Percentage — % of student fees per class</option>
            <option value="FIXED_HOURS">Fixed Hours — hourly rate per section taught (1 hr each)</option>
          </select>
        </div>
        {form.paymentType === "PER_CLASS" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rate per Section ($)</label>
            <input
              type="number" min="0" step="0.01" value={form.perClassRate}
              onChange={e => field("perClassRate", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        )}
        {form.paymentType === "REVENUE_PERCENTAGE" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Revenue Percentage (%)</label>
            <input
              type="number" min="0" max="100" step="0.01" value={form.revenuePercentage}
              onChange={e => field("revenuePercentage", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        )}
        {form.paymentType === "FIXED_HOURS" && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hourly Rate ($)</label>
            <input
              type="number" min="0" step="0.01" value={form.hourlyRate}
              onChange={e => field("hourlyRate", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="teacher-active" checked={form.active}
              onChange={e => field("active", e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="teacher-active" className="text-xs font-medium text-gray-600">Active</label>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit" disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : editing ? "Save Changes" : "Create Teacher"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
