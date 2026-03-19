"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getStaffPaymentList } from "../actions/staffPayments";
import { getTeacherPaymentList } from "../actions/teacherPayments";

type StaffUser = Awaited<ReturnType<typeof getStaffPaymentList>>[number];
type TeacherUser = Awaited<ReturnType<typeof getTeacherPaymentList>>[number];

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    PDF_GENERATED: "bg-blue-100 text-blue-700",
    FINALIZED: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PDF_GENERATED: "PDF Ready",
    FINALIZED: "Finalized",
  };
  return { cls: map[status] ?? "bg-gray-100 text-gray-500", label: labels[status] ?? status };
}

function payTypeLabel(t: string | null) {
  if (t === "PER_CLASS") return "Per Section";
  if (t === "REVENUE_PERCENTAGE") return "Revenue %";
  if (t === "FIXED_HOURS") return "Hourly";
  if (t === "MONTHLY_SALARY") return "Salary";
  return t ?? "—";
}

function getNextDueDate(createdAt: Date | string): Date {
  const joined = new Date(createdAt);
  const now = new Date();
  const day = joined.getDate();
  let candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (candidate < now) {
    candidate = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  return candidate;
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<"staff" | "teachers">("staff");
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [teacherUsers, setTeacherUsers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    Promise.all([getStaffPaymentList(), getTeacherPaymentList()])
      .then(([s, t]) => { setStaffUsers(s); setTeacherUsers(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function reload() {
    startTransition(() => {
      Promise.all([getStaffPaymentList(), getTeacherPaymentList()])
        .then(([s, t]) => { setStaffUsers(s); setTeacherUsers(t); });
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage staff and teacher salary payments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(["staff", "teachers"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "staff" ? "Staff & Managers" : "Teachers"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : tab === "staff" ? (
        <div className="space-y-3">
          {staffUsers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-400">
              No staff or managers found.
            </div>
          ) : (
            staffUsers.map(u => {
              const latestPayment = u.staffPayments[0];
              const nextDue = getNextDueDate(u.createdAt);
              const daysUntil = Math.ceil((nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntil < 0;
              const isDueSoon = daysUntil <= 3;

              return (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                      {u.userId && <span className="font-mono text-xs text-gray-400">{u.userId}</span>}
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {u.role === "MANAGER" ? "Manager" : u.staffType ?? "Staff"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>Salary: <span className="font-medium text-gray-700">${u.monthlySalary?.toFixed(2) ?? "—"}</span></span>
                      <span>Next due: <span className={`font-medium ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-gray-700"}`}>
                        {nextDue.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {isOverdue ? " (overdue)" : isDueSoon && !isOverdue ? ` (${daysUntil}d)` : ""}
                      </span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {latestPayment && (() => {
                      const { cls, label } = statusBadge(latestPayment.status);
                      return (
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Net: ${latestPayment.netAmount.toFixed(2)} · {new Date(latestPayment.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      );
                    })()}
                    <Link
                      href={`/manager/payments/staff/${u.id}`}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >
                      Manage Payment
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {teacherUsers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-400">
              No teachers found.
            </div>
          ) : (
            teacherUsers.map(u => {
              const latestPayment = u.teacherPayments[0];
              return (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                      {u.userId && <span className="font-mono text-xs text-gray-400">{u.userId}</span>}
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        {payTypeLabel(u.paymentType)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {u.paymentType === "PER_CLASS" && u.perClassRate && `$${u.perClassRate}/section`}
                      {u.paymentType === "REVENUE_PERCENTAGE" && u.revenuePercentage && `${u.revenuePercentage}% revenue`}
                      {u.paymentType === "FIXED_HOURS" && u.hourlyRate && `$${u.hourlyRate}/hr`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {latestPayment && (() => {
                      const { cls, label } = statusBadge(latestPayment.status);
                      return (
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {MONTHS[latestPayment.month]} {latestPayment.year} · Net: ${latestPayment.netAmount.toFixed(2)}
                          </p>
                        </div>
                      );
                    })()}
                    <Link
                      href={`/manager/payments/teachers/${u.id}`}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg whitespace-nowrap"
                    >
                      Manage Payment
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
