"use client";

import { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import {
  getTeacherPaymentContext,
  createOrUpdateTeacherPayment,
  finalizeTeacherPayment,
} from "@/app/manager/actions/teacherPayments";

type Context = Awaited<ReturnType<typeof getTeacherPaymentContext>>;

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

export default function TeacherPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teacherId } = use(params);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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
    setError("");
    try {
      const data = await getTeacherPaymentContext(teacherId, selectedMonth, selectedYear);
      setCtx(data);
      if (data.existingPayment) {
        setDeduction(data.existingPayment.deduction.toString());
        setDeductionReason(data.existingPayment.deductionReason ?? "");
        setMemo(data.existingPayment.memo ?? "");
      } else {
        setDeduction("0");
        setDeductionReason("");
        setMemo("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [teacherId, selectedMonth, selectedYear]);

  async function handleSave() {
    if (!ctx) return;
    setError(""); setSuccess("");
    setSaving(true);
    try {
      await createOrUpdateTeacherPayment(
        teacherId,
        selectedMonth,
        selectedYear,
        Number(deduction) || 0,
        deductionReason,
        memo,
        ctx.sectionSummaries,
        ctx.eligibleClassMonths.map(cm => ({
          ...cm,
          percentageSnapshot: ctx.teacher.revenuePercentage ?? 0,
        })),
      );
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
      await finalizeTeacherPayment(ctx.existingPayment.id);
      setSuccess("Payment finalized.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize");
    }
    setSaving(false);
  }

  function handleDownloadPdf() {
    if (!ctx?.existingPayment) return;
    window.open(`/api/pdf/teacher-payment/${ctx.existingPayment.id}`, "_blank");
    setTimeout(() => load(), 1500);
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  if (!ctx) return <div className="p-8 text-sm text-red-500">{error || "Not found"}</div>;

  const { teacher, grossAmount, sectionSummaries, eligibleClassMonths,
    existingPayment, reports, absenceRecords, pastPayments } = ctx;

  const deductionNum = Number(deduction) || 0;
  const netAmount = Math.max(0, grossAmount - deductionNum);
  const isFinalized = existingPayment?.status === "FINALIZED";
  const isPdfReady = existingPayment?.status === "PDF_GENERATED" || isFinalized;

  const payTypeLabel =
    teacher.paymentType === "PER_CLASS" ? "Per Section" :
    teacher.paymentType === "REVENUE_PERCENTAGE" ? "Revenue %" :
    teacher.paymentType === "FIXED_HOURS" ? "Hourly" : teacher.paymentType ?? "—";

  // Year options (current year ± 1)
  const yearOptions = [selectedYear - 1, selectedYear, selectedYear + 1].filter(y => y >= 2024);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/manager/payments" className="text-sm text-teal-600 hover:text-teal-800 font-medium">
          ← Back to Payments
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {teacher.userId && <span className="font-mono text-sm text-gray-400">{teacher.userId}</span>}
            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{payTypeLabel}</span>
            <span className="text-xs text-gray-500">{teacher.branch?.name}</span>
          </div>
        </div>
        {existingPayment && <StatusBadge status={existingPayment.status} />}
      </div>

      {/* Month selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Month</label>
          <select
            value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {MONTHS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Year</label>
          <select
            value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="text-sm text-gray-500">{MONTHS[selectedMonth]} {selectedYear}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Sections taught — PER_CLASS / FIXED_HOURS */}
          {teacher.paymentType !== "REVENUE_PERCENTAGE" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Sections Taught — {MONTHS[selectedMonth]} {selectedYear}
                {sectionSummaries.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {sectionSummaries.reduce((s, x) => s + x.sessionsCount, 0)} sessions total
                  </span>
                )}
              </h2>
              {sectionSummaries.length === 0 ? (
                <p className="text-xs text-gray-400">No sections assigned or no sessions recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 pb-2">Class</th>
                        <th className="text-left text-xs font-medium text-gray-500 pb-2">Section</th>
                        <th className="text-center text-xs font-medium text-gray-500 pb-2">Sessions</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-2">Rate</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionSummaries.map((s, i) => (
                        <tr key={s.classSectionId} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                          <td className="py-2 text-gray-700">{s.classNameSnapshot}</td>
                          <td className="py-2 text-gray-500 text-xs">{s.sectionLabel}</td>
                          <td className="py-2 text-center font-semibold text-teal-700">{s.sessionsCount}</td>
                          <td className="py-2 text-right text-gray-600">${fmt(s.rateSnapshot)}</td>
                          <td className="py-2 text-right font-semibold text-gray-900">${fmt(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="py-2 text-xs font-medium text-gray-500">Total Gross</td>
                        <td className="py-2 text-right font-bold text-gray-900">${fmt(grossAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Class Months — REVENUE_PERCENTAGE */}
          {teacher.paymentType === "REVENUE_PERCENTAGE" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Eligible Class Months</h2>
              <p className="text-xs text-gray-400 mb-4">
                Only finalized class months not yet paid. Rate: {teacher.revenuePercentage}%
              </p>
              {eligibleClassMonths.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  No eligible class months. Ensure class months are finalized and not already paid.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 pb-2">Class</th>
                        <th className="text-center text-xs font-medium text-gray-500 pb-2">Month</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-2">Total Fees</th>
                        <th className="text-center text-xs font-medium text-gray-500 pb-2">Sections</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleClassMonths.map((cm, i) => (
                        <tr key={`${cm.courseClassId}:${cm.monthNumber}`} className={`border-b border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50"}`}>
                          <td className="py-2 text-gray-700">{cm.classNameSnapshot}</td>
                          <td className="py-2 text-center text-gray-500">M{cm.monthNumber}</td>
                          <td className="py-2 text-right text-gray-600">${fmt(cm.totalFeesAmount)}</td>
                          <td className="py-2 text-center text-xs text-gray-400">{cm.teacherSections}/{cm.sectionsInClass}</td>
                          <td className="py-2 text-right font-semibold text-gray-900">${fmt(cm.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="py-2 text-xs font-medium text-gray-500">Total Gross</td>
                        <td className="py-2 text-right font-bold text-gray-900">${fmt(grossAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Absences */}
          {absenceRecords.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Absences This Period
                <span className="ml-2 bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {absenceRecords.length}
                </span>
              </h2>
              <div className="space-y-1">
                {absenceRecords.map(a => (
                  <div key={a.id} className="flex items-center gap-3 text-sm py-1">
                    <span className="text-red-500 font-medium w-36 shrink-0">{fmtDate(a.date)}</span>
                    <span className="text-gray-600">{a.classSection.courseClass.courseTemplate.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <label className="block text-xs font-medium text-gray-600 mb-1">Gross Earnings</label>
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
                  placeholder="e.g. Payment for sections taught in March 2026..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
            </fieldset>
          </div>

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

        {/* Right column */}
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

          {/* Rate Info */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-xs font-medium text-teal-700 mb-2">Rate Details</p>
            <p className="text-sm text-teal-900 font-semibold">
              {teacher.paymentType === "PER_CLASS" && `$${fmt(teacher.perClassRate ?? 0)} per section`}
              {teacher.paymentType === "FIXED_HOURS" && `$${fmt(teacher.hourlyRate ?? 0)} per hour`}
              {teacher.paymentType === "REVENUE_PERCENTAGE" && `${teacher.revenuePercentage}% of class revenue`}
            </p>
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
                    <span className="text-gray-600">{SHORT_MONTHS[p.month]} {p.year}</span>
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
