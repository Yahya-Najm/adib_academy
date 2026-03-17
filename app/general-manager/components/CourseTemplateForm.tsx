"use client";

import { useState } from "react";
import { createCourseTemplate, updateCourseTemplate } from "../actions/courseTemplates";

interface Branch { id: string; name: string; }

interface InitialTemplate {
  id: string;
  name: string;
  branchId: string | null;
  monthlyFee: number;
  durationMonths: number;
  numSections: number;
}

interface Props {
  initial?: InitialTemplate;
  branches: Branch[];
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function CourseTemplateForm({ initial, branches, onSuccess, onCancel }: Props) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? "");
  const [monthlyFee, setMonthlyFee] = useState(initial?.monthlyFee?.toString() ?? "");
  const [durationMonths, setDurationMonths] = useState(initial?.durationMonths?.toString() ?? "");
  const [numSections, setNumSections] = useState(initial?.numSections?.toString() ?? "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const payload = {
      name,
      branchId: branchId || null,
      monthlyFee: parseFloat(monthlyFee),
      durationMonths: parseInt(durationMonths),
      numSections: parseInt(numSections),
    };
    try {
      if (editing) {
        await updateCourseTemplate(initial.id, payload);
      } else {
        await createCourseTemplate(payload);
        setName(""); setBranchId(""); setMonthlyFee(""); setDurationMonths(""); setNumSections("1");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course template");
    }
    setLoading(false);
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-lg">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        {editing ? "Edit Course Template" : "New Course Template"}
      </h2>
      <div className="space-y-3">

        <div>
          <label className={labelCls}>Course Name *</label>
          <input
            value={name} onChange={e => setName(e.target.value)} required
            placeholder="e.g. English Book A1, Computer Basics"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Branch</label>
          <select
            value={branchId} onChange={e => setBranchId(e.target.value)}
            className={inputCls}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-0.5">Leave blank to make this template available to all branches</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monthly Fee (AFN) *</label>
            <input
              type="number" min="0" step="0.01"
              value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} required
              placeholder="e.g. 1500"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Duration (Months) *</label>
            <input
              type="number" min="1"
              value={durationMonths} onChange={e => setDurationMonths(e.target.value)} required
              placeholder="e.g. 6"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Number of Sections *</label>
          <input
            type="number" min="1"
            value={numSections} onChange={e => setNumSections(e.target.value)} required
            placeholder="e.g. 2"
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Each section can have its own teacher (e.g. 1 for Book, 2 for Book + Grammar)
          </p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit" disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : editing ? "Save Changes" : "Create Template"}
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
