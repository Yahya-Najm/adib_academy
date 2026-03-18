"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPaymentNotifications } from "./actions/notifications";
import { getReportCountsForDate, getPendingActionableReports } from "./actions/reports";
import { getExamNotifications } from "./actions/exams";

type PaymentNotif = Awaited<ReturnType<typeof getPaymentNotifications>>[number];
type ReportCounts = Awaited<ReturnType<typeof getReportCountsForDate>>;
type ExamNotif = Awaited<ReturnType<typeof getExamNotifications>>[number];
type ActionableReport = Awaited<ReturnType<typeof getPendingActionableReports>>[number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function ManagerPage() {
  const [notifications, setNotifications] = useState<PaymentNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportCounts, setReportCounts] = useState<ReportCounts | null>(null);
  const [reportDate, setReportDate] = useState(toDateStr(new Date()));
  const [examNotifs, setExamNotifs] = useState<ExamNotif[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionableReport[]>([]);

  useEffect(() => {
    Promise.all([
      getPaymentNotifications(),
      getExamNotifications(),
      getPendingActionableReports(),
    ]).then(([notifs, exams, actions]) => {
      setNotifications(notifs);
      setExamNotifs(exams);
      setPendingActions(actions);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getReportCountsForDate(reportDate).then(setReportCounts).catch(() => {});
  }, [reportDate]);

  const now = new Date();
  const today = toDateStr(now);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-gray-500 mt-1">Welcome, Manager</p>

      {/* ── Exam Notifications ── */}
      {examNotifs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Exam Alerts</h2>
            <Link href="/manager/classes" className="text-sm text-teal-600 hover:text-teal-800 font-medium">
              View Classes
            </Link>
          </div>
          <div className="space-y-2">
            {examNotifs.map(exam => {
              const examDate = new Date(exam.date);
              const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isUpcoming = daysUntil >= 0;
              const needsScoring = !exam.scoringFinalized;
              const isPast = daysUntil < 0;

              return (
                <div key={exam.id} className={`border rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${
                  isPast && needsScoring
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{exam.title}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        exam.examType === "FINAL" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {exam.examType === "FINAL" ? "Final" : "Regular"}
                      </span>
                      {needsScoring && isPast && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Scoring Needed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {exam.courseClass.courseTemplate.name}
                      {" · "}
                      {examDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {isUpcoming
                        ? daysUntil === 0 ? " — Today!" : ` — in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`
                        : ` — ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`
                      }
                    </p>
                  </div>
                  <Link
                    href={`/manager/classes/${exam.courseClassId}`}
                    className="shrink-0 text-xs text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg"
                  >
                    View Class
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pending Actionable Reports ── */}
      {pendingActions.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Pending Actions
              <span className="ml-2 inline-flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5">
                {pendingActions.length}
              </span>
            </h2>
            <Link href="/manager/reports" className="text-sm text-teal-600 hover:text-teal-800 font-medium">
              View Reports
            </Link>
          </div>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map(r => (
              <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        {r.subjectType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {r.actionDescription && (
                      <p className="text-sm font-semibold text-orange-800">{r.actionDescription}</p>
                    )}
                    {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                    <p className="text-xs text-gray-400 mt-1">by {r.manager.name}</p>
                  </div>
                </div>
              </div>
            ))}
            {pendingActions.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                +{pendingActions.length - 5} more — <Link href="/manager/reports" className="text-teal-600 hover:underline">view all</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Reports Widget ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-800">Reports</h2>
          <div className="flex items-center gap-2">
            <input type="date" value={reportDate} max={today}
              onChange={e => setReportDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Link href="/manager/reports"
              className="text-sm text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg">
              View All
            </Link>
          </div>
        </div>
        {reportCounts ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: reportCounts.total, color: "bg-gray-50 border-gray-200 text-gray-900" },
              { label: "Staff", value: reportCounts.staff, color: "bg-blue-50 border-blue-200 text-blue-800" },
              { label: "Teachers", value: reportCounts.teachers, color: "bg-purple-50 border-purple-200 text-purple-800" },
              { label: "Students", value: reportCounts.students, color: "bg-teal-50 border-teal-200 text-teal-800" },
              { label: "Classes", value: reportCounts.classes, color: "bg-orange-50 border-orange-200 text-orange-800" },
            ].map(item => (
              <div key={item.label} className={`border rounded-xl px-4 py-3 ${item.color}`}>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-70">{item.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">Loading…</div>
        )}
      </div>

      {/* ── Payment Notifications ── */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Payment Notifications</h2>

        {loading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700 font-medium">
            All payments up to date.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const isOverdue = new Date(n.dueDate) <= now;
              const student = n.enrollment.student;
              const course = n.enrollment.courseClass.courseTemplate.name;
              return (
                <div
                  key={n.id}
                  className={`border rounded-xl px-5 py-4 flex items-center justify-between ${
                    isOverdue ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {student.firstName} {student.lastName}
                      {student.studentId && (
                        <span className="ml-2 text-xs font-mono text-gray-400">{student.studentId}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {course} — Month {n.monthNumber} · Due {new Date(n.dueDate).toLocaleDateString()}
                      {n.status === "PARTIAL" && n.paidAmount != null && (
                        <span className="ml-1 text-orange-600">· Partial (paid ${n.paidAmount} of ${n.amount})</span>
                      )}
                      {n.status !== "PARTIAL" && <span className="ml-1">· ${n.amount}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {isOverdue ? "Overdue" : "Due Soon"}
                    </span>
                    <Link
                      href={`/manager/students/${student.id}`}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium border border-teal-200 px-3 py-1.5 rounded-lg"
                    >
                      Go to Student
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
