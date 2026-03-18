"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReportCountsGM, getAllActionableReportsGM } from "./actions/reports";
import { getExamNotificationsGM } from "./actions/classes";

type ReportCounts = Awaited<ReturnType<typeof getReportCountsGM>>;
type ExamNotif = Awaited<ReturnType<typeof getExamNotificationsGM>>[number];
type ActionableReport = Awaited<ReturnType<typeof getAllActionableReportsGM>>[number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function GeneralManagerPage() {
  const [reportDate, setReportDate] = useState(toDateStr(new Date()));
  const [reportCounts, setReportCounts] = useState<ReportCounts | null>(null);
  const [examNotifs, setExamNotifs] = useState<ExamNotif[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionableReport[]>([]);

  useEffect(() => {
    Promise.all([
      getExamNotificationsGM(),
      getAllActionableReportsGM(undefined, true),
    ]).then(([exams, actions]) => {
      setExamNotifs(exams);
      setPendingActions(actions);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getReportCountsGM(reportDate).then(setReportCounts).catch(() => {});
  }, [reportDate]);

  const now = new Date();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-gray-500 mt-1">Welcome, General Manager</p>

      {/* Exam Alerts */}
      {examNotifs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Exam Alerts — All Branches</h2>
            <Link href="/general-manager/classes" className="text-sm text-orange-600 hover:text-orange-800 font-medium">
              View Classes
            </Link>
          </div>
          <div className="space-y-2">
            {examNotifs.map(exam => {
              const examDate = new Date(exam.date);
              const daysUntil = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isPast = daysUntil < 0;
              return (
                <div key={exam.id} className={`border rounded-xl px-5 py-4 flex items-center justify-between gap-4 ${isPast ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{exam.title}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${exam.examType === "FINAL" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                        {exam.examType === "FINAL" ? "Final" : "Regular"}
                      </span>
                      {isPast && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">Scoring Needed</span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {exam.courseClass.courseTemplate.name} · {exam.courseClass.branch.name}
                      {" · "}{examDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {daysUntil === 0 ? " — Today!" : isPast ? ` — ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago` : ` — in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <Link href={`/general-manager/classes/${exam.courseClassId}`}
                    className="shrink-0 text-xs text-orange-600 hover:text-orange-800 font-medium border border-orange-200 px-3 py-1.5 rounded-lg">
                    View Class
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Actionable Reports */}
      {pendingActions.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Pending Actions — All Branches
              <span className="ml-2 inline-flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5">
                {pendingActions.length}
              </span>
            </h2>
            <Link href="/general-manager/reports" className="text-sm text-orange-600 hover:text-orange-800 font-medium">
              View Reports
            </Link>
          </div>
          <div className="space-y-2">
            {pendingActions.slice(0, 5).map(r => (
              <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{r.subjectType}</span>
                  <span className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  {r.branch && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{r.branch.name}</span>}
                </div>
                {"subjectName" in r && r.subjectName && (
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{r.subjectName as string}</p>
                )}
                {r.actionDescription && <p className="text-sm font-semibold text-orange-800">{r.actionDescription}</p>}
                {r.content && <p className="text-sm text-gray-700">{r.content}</p>}
                <p className="text-xs text-gray-400 mt-1">by {r.manager.name}</p>
              </div>
            ))}
            {pendingActions.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                +{pendingActions.length - 5} more — <Link href="/general-manager/reports" className="text-orange-600 hover:underline">view all</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reports Widget */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-800">Reports — All Branches</h2>
          <div className="flex items-center gap-2">
            <input type="date" value={reportDate} max={toDateStr(new Date())}
              onChange={e => setReportDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <Link href="/general-manager/reports"
              className="text-sm text-orange-600 hover:text-orange-800 font-medium border border-orange-200 px-3 py-1.5 rounded-lg">
              Browse All
            </Link>
          </div>
        </div>

        {reportCounts ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
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
            {reportCounts.byBranch.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                      <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportCounts.byBranch.map(b => (
                      <tr key={b.branchName} className="hover:bg-gray-50">
                        <td className="px-5 py-2 font-medium text-gray-800">{b.branchName}</td>
                        <td className="px-5 py-2 text-gray-600">{b.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400">Loading…</div>
        )}
      </div>
    </div>
  );
}
