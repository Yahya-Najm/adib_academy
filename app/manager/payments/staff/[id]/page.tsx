"use client";

import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import {
  getStaffPaymentContext,
  createOrUpdateStaffPayment,
  finalizeStaffPayment,
} from "@/app/manager/actions/staffPayments";

type Context = Awaited<ReturnType<typeof getStaffPaymentContext>>;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    DRAFT: ["bg-gray-100 text-gray-600", "Draft"],
    PDF_GENERATED: ["bg-blue-100 text-blue-700", "PDF Generated"],
    FINALIZED: ["bg-green-100 text-green-700", "Finalized"],
  };
  const [cls, label] = map[status] ?? ["bg-gray-100 text-gray-500", status];
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default function StaffPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: staffUserId } = use(params);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [deduction, setDeduction] = useState("0");
  const [deductionReason, setDeductionReason] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const data = await getStaffPaymentContext(staffUserId);
      setCtx(data);
      if (data.existingPayment) {
        setDeduction(data.existingPayment.deduction.toString());
        setDeductionReason(data.existingPayment.deductionReason ?? "");
        setMemo(data.existingPayment.memo ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [staffUserId]);

  async function handleSave() {
    setError(""); setSuccess("");
    setSaving(true);
    try {
      await createOrUpdateStaffPayment(staffUserId, Number(deduction) || 0, deductionReason, memo);
      setSuccess("Payment saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  }

  async function handleFinalize() {
    if (!ctx?.existingPayment) return;
    setError(""); setSuccess("");
    setSaving(true);
    try {
      await finalizeStaffPayment(ctx.existingPayment.id);
      setSuccess("Payment finalized.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize");
    }
    setSaving(false);
  }

  function handleDownloadPdf() {
    if (!ctx?.existingPayment) return;
    window.open(`/api/pdf/staff-payment/${ctx.existingPayment.id}`, "_blank");
    // Reload after a short delay to pick up PDF_GENERATED status
    setTimeout(() => load(), 1500);
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  if (!ctx) return <div className="p-8 text-sm text-red-500">{error || "Not found"}</div>;

  const { user, dueDate, periodStart, periodEnd, grossAmount, existingPayment,
    presentDays, absentDays, lateDays, reports, pastPayments } = ctx;

  const deductionNum = Number(deduction) || 0;
  const netAmount = Math.max(0, grossAmount - deductionNum);
  const isFinalized = existingPayment?.status === "FINALIZED";
  const isPdfReady = existingPayment?.status === "PDF_GENERATED" || isFinalized;

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <div className="mb-6">
        <Link href="/manager/payments" className="text-sm text-teal-600 hover:text-teal-800 font-medium">
          ← Back to Payments
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {user.userId && <span className="font-mono text-sm text-gray-400">{user.userId}</span>}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {user.role === "MANAGER" ? "Manager" : user.staffType ?? "Staff"}
            </span>
            <span className="text-xs text-gray-500">{user.branch?.name}</span>
          </div>
        </div>
        {existingPayment && <StatusBadge status={existingPayment.status} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pay Period Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Current Pay Period</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Period Start</p>
                <p className="font-medium text-gray-900">{fmtDate(periodStart)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Period End</p>
                <p className="font-medium text-gray-900">{fmtDate(periodEnd)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                <p className="font-semibold text-teal-700">{fmtDate(dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Attendance Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{presentDays}</p>
                <p className="text-xs text-green-600 mt-0.5">Present</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{absentDays}</p>
                <p className="text-xs text-red-500 mt-0.5">Absent</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{lateDays}</p>
                <p className="text-xs text-amber-600 mt-0.5">Late</p>
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Reports This Period
              {reports.length > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </h2>
            {reports.length === 0 ? (
              <p className="text-xs text-gray-400">No reports for this period.</p>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <div key={r.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      r.reportType === "ABSENT" ? "bg-red-100 text-red-700" :
                      r.reportType === "LATE" ? "bg-amber-100 text-amber-700" :
                      "bg-indigo-100 text-indigo-700"
                    }`}>{r.reportType}</span>
                    <div className="flex-1 min-w-0">
                      {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtDate(r.date)} · {r.manager?.name ?? r.teacher?.name ?? "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Details</h2>
            <fieldset disabled={isFinalized} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
                  ${fmt(grossAmount)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deduction ($)</label>
                <input
                  type="number" min="0" step="0.01" value={deduction}
                  onChange={e => setDeduction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0.00"
                />
              </div>
              {deductionNum > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Deduction *</label>
                  <input
                    type="text" value={deductionReason} onChange={e => setDeductionReason(e.target.value)}
                    placeholder="Explain the deduction..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">General Memo / Statement</label>
                <textarea
                  value={memo} onChange={e => setMemo(e.target.value)} rows={3}
                  placeholder="e.g. Paid the amount of $X for the work performed this month..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
            </fieldset>
          </div>

          {/* Errors / Success */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          {/* Actions */}
          {!isFinalized && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleSave} disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Payment"}
              </button>
              {existingPayment && (
                <button
                  onClick={handleDownloadPdf} disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  Download PDF
                </button>
              )}
              {isPdfReady && existingPayment && (
                <button
                  onClick={handleFinalize} disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  Finalize Payment
                </button>
              )}
            </div>
          )}
          {isFinalized && existingPayment && (
            <button
              onClick={handleDownloadPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Download PDF
            </button>
          )}
        </div>

        {/* Right column — summary + history */}
        <div className="space-y-6">
          {/* Net Amount */}
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <p className="text-xs text-gray-400 mb-1">Net Payment</p>
            <p className="text-3xl font-bold text-emerald-400">${fmt(netAmount)}</p>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Gross</span>
                <span className="text-white">${fmt(grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Deduction</span>
                <span className="text-red-400">- ${fmt(deductionNum)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment History</h2>
            {pastPayments.length === 0 ? (
              <p className="text-xs text-gray-400">No payment history yet.</p>
            ) : (
              <div className="space-y-2">
                {pastPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{fmtDate(p.dueDate)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium">${fmt(p.netAmount)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        p.status === "FINALIZED" ? "bg-green-100 text-green-700" :
                        p.status === "PDF_GENERATED" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {p.status === "FINALIZED" ? "Paid" : p.status === "PDF_GENERATED" ? "PDF" : "Draft"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
