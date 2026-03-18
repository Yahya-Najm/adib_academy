"use client";

import { useMemo, useState } from "react";
import { createStaff, updateStaff } from "../actions/staff";

const STAFF_TYPES = ["Cleaner", "Cook", "Security", "Receptionist", "Driver", "Maintenance", "Other"];

interface Branch { id: string; name: string; }

interface InitialStaff {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  staffType: string | null;
  branchId: string | null;
  monthlySalary: number | null;
}

interface Props {
  branches: Branch[];
  initial?: InitialStaff;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function StaffForm({ branches, initial, onSuccess, onCancel }: Props) {
  const editing = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    staffType: initial?.staffType ?? "Cleaner",
    branchId: initial?.branchId ?? "",
    monthlySalary: initial?.monthlySalary?.toString() ?? "",
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
        await updateStaff(initial.id, form.name, form.email, form.staffType, form.branchId, form.monthlySalary, form.active);
      } else {
        await createStaff(form.name, form.email, form.staffType, form.branchId, form.monthlySalary);
        setForm({ name: "", email: "", staffType: "Cleaner", branchId: "", monthlySalary: "", active: true });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save staff member");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-md">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">{editing ? "Edit Staff Member" : "New Staff Member"}</h2>
      {!editing && <p className="text-xs text-gray-400 mb-4">Staff members do not have dashboard access and do not need a login password.</p>}
      <div className={`space-y-3 ${editing ? "mt-4" : ""}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
          <input
            value={form.name} onChange={e => field("name", e.target.value)} required
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Staff Type *</label>
          <select
            value={form.staffType} onChange={e => field("staffType", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          >
            {STAFF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email (optional)</label>
          <input
            type="email" value={form.email} onChange={e => field("email", e.target.value)}
            placeholder="For contact purposes only"
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary ($)</label>
          <input
            type="number" min="0" step="0.01" value={form.monthlySalary}
            onChange={e => field("monthlySalary", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        {editing && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="staff-active" checked={form.active}
              onChange={e => field("active", e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="staff-active" className="text-xs font-medium text-gray-600">Active</label>
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit" disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : editing ? "Save Changes" : "Add Staff Member"}
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
