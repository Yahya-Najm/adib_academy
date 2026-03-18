"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPaymentNotifications } from "./actions/notifications";
import { getReportCountsForDate } from "./actions/reports";

type Notification = Awaited<ReturnType<typeof getPaymentNotifications>>[number];
type ReportCounts = Awaited<ReturnType<typeof getReportCountsForDate>>;

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function ManagerPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportCounts, setReportCounts] = useState<ReportCounts | null>(null);
  const [reportDate, setReportDate] = useState(toDateStr(new Date()));

  useEffect(() => {
    getPaymentNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getReportCountsForDate(reportDate).then(setReportCounts).catch(() => {});
  }, [reportDate]);

  const now = new Date();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-gray-500 mt-1">Welcome, Manager</p>

      {/* ── Reports Widget ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-800">Reports</h2>
          <div className="flex items-center gap-2">
            <input type="date" value={reportDate} max={toDateStr(new Date())}
              onChange={e => setReportDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <Link href={`/manager/reports`}
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
