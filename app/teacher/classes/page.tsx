"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTeacherClasses } from "../actions/classes";

type TeacherClass = Awaited<ReturnType<typeof getTeacherClasses>>[number];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherClasses().then(data => { setClasses(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Classes</h1>
      <p className="text-sm text-gray-500 mb-6">Classes you are assigned to teach</p>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
          No classes assigned to you yet.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => {
            const mySections = cls.sections.filter(s => s.teacher.id === cls.mySection.teacherId);
            return (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}
                className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{cls.courseTemplate.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[cls.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {cls.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{cls.classId}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{cls.branch.name}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{cls.classTime}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{cls.studentCount} students</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {mySections.map(s => (
                        <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Section {s.sectionNumber}{s.sectionName ? ` — ${s.sectionName}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
