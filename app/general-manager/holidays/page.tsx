"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getHolidays, createHoliday, deleteHoliday,
  getWeeklyHolidays, createWeeklyHoliday, deleteWeeklyHoliday,
} from "../actions/holidays";
import { getBranches } from "../actions/branches";

type Holiday = Awaited<ReturnType<typeof getHolidays>>[number];
type WeeklyHoliday = Awaited<ReturnType<typeof getWeeklyHolidays>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weekly, setWeekly] = useState<WeeklyHoliday[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", branchId: "" });
  const [weeklyForm, setWeeklyForm] = useState({ dayOfWeek: "", branchId: "" });
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [error, setError] = useState("");
  const [weeklyError, setWeeklyError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmWeeklyId, setConfirmWeeklyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    const [h, w, b] = await Promise.all([getHolidays(), getWeeklyHolidays(), getBranches()]);
    setHolidays(h);
    setWeekly(w);
    setBranches(b);
  }

  useEffect(() => { load(); }, []);

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      try {
        await createHoliday({ name: form.name, date: form.date, branchId: form.branchId || undefined });
        setForm({ name: "", date: "", branchId: "" });
        setShowForm(false);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create holiday");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteHoliday(id);
        setConfirmId(null);
        load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function handleWeeklySubmit() {
    setWeeklyError("");
    startTransition(async () => {
      try {
        await createWeeklyHoliday({ dayOfWeek: weeklyForm.dayOfWeek, branchId: weeklyForm.branchId || undefined });
        setWeeklyForm({ dayOfWeek: "", branchId: "" });
        setShowWeeklyForm(false);
        load();
      } catch (err: unknown) {
        setWeeklyError(err instanceof Error ? err.message : "Failed to create weekly holiday");
      }
    });
  }

  function handleWeeklyDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteWeeklyHoliday(id);
        setConfirmWeeklyId(null);
        load();
      } catch (err: unknown) {
        setWeeklyError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="p-8 space-y-10">

      {/* ── One-off Official Holidays ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Official Holidays</h1>
            <p className="text-gray-500 text-sm mt-0.5">One-off dates that block attendance academy-wide or per branch</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError(""); }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Holiday"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">New Holiday</h2>
            {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name / Reason *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. National Day"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Branch (blank = all branches)</label>
                <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={isPending}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {isPending ? "Saving..." : "Add Holiday"}
              </button>
              <button onClick={() => { setShowForm(false); setError(""); }}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {holidays.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            No holidays defined yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Name / Reason","Date","Branch",""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holidays.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{h.name}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(h.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{h.branch ? h.branch.name : "All Branches"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setConfirmId(h.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Weekly Recurring Holidays ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Weekly Recurring Off-Days</h2>
            <p className="text-gray-500 text-sm mt-0.5">Every occurrence of this weekday is treated as a holiday — no attendance taken</p>
          </div>
          <button
            onClick={() => { setShowWeeklyForm(!showWeeklyForm); setWeeklyError(""); }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showWeeklyForm ? "Cancel" : "+ Add Weekly Off-Day"}
          </button>
        </div>

        {showWeeklyForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">New Weekly Off-Day</h3>
            {weeklyError && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{weeklyError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Day of Week *</label>
                <select value={weeklyForm.dayOfWeek} onChange={e => setWeeklyForm(f => ({ ...f, dayOfWeek: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Select a day…</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Branch (blank = all branches)</label>
                <select value={weeklyForm.branchId} onChange={e => setWeeklyForm(f => ({ ...f, branchId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleWeeklySubmit} disabled={isPending || !weeklyForm.dayOfWeek}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {isPending ? "Saving..." : "Add Off-Day"}
              </button>
              <button onClick={() => { setShowWeeklyForm(false); setWeeklyError(""); }}
                className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {weekly.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            No weekly off-days defined yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Day","Branch",""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {weekly.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{w.dayOfWeek}</td>
                    <td className="px-5 py-3 text-gray-500">{w.branch ? w.branch.name : "All Branches"}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setConfirmWeeklyId(w.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Confirm delete modals ── */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Holiday</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(confirmId)} disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                {isPending ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmWeeklyId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete Weekly Off-Day</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleWeeklyDelete(confirmWeeklyId)} disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium">
                {isPending ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => setConfirmWeeklyId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
