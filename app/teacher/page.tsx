"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTeacherAnnouncements } from "./actions/announcements";
import { getTeacherExamNotifications } from "./actions/classes";

type Holiday = Awaited<ReturnType<typeof getTeacherAnnouncements>>[number];
type ExamNotif = Awaited<ReturnType<typeof getTeacherExamNotifications>>[number];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function TeacherPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [exams, setExams] = useState<ExamNotif[]>([]);

  useEffect(() => {
    getTeacherAnnouncements().then(setHolidays).catch(() => {});
    getTeacherExamNotifications().then(setExams).catch(() => {});
  }, []);

  const today = toDateStr(new Date());

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back</p>
      </div>

      {/* Exam Notifications */}
      {exams.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Exam Alerts</h2>
          <div className="space-y-2">
            {exams.map(exam => {
              const examDate = toDateStr(new Date(exam.date));
              const isPast = examDate < today;
              return (
                <Link key={exam.id} href={`/teacher/classes/${exam.courseClassId}`}
                  className={`block rounded-xl px-5 py-4 border ${isPast ? "bg-red-50 border-red-200" : "bg-purple-50 border-purple-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{exam.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {exam.courseClass.courseTemplate.name} ·{" "}
                        {new Date(exam.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${exam.examType === "FINAL" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                        {exam.examType === "FINAL" ? "Final" : "Regular"}
                      </span>
                      {isPast && !exam.scoringFinalized && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Scoring pending
                        </span>
                      )}
                      {!isPast && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Holidays */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Upcoming Holidays</h2>
        {holidays.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
            No upcoming holidays or events.
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map(h => (
              <div key={h.id} className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{h.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(h.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {h.branch ? ` — ${h.branch.name}` : " — All Branches"}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    No attendance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
