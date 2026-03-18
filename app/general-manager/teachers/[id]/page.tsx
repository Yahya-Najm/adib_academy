"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTeacherProfileGM } from "../../actions/teachers";
import ReportsSection from "@/components/reports/ReportsSection";

type Profile = Awaited<ReturnType<typeof getTeacherProfileGM>>;

const PAYMENT_LABELS: Record<string, string> = {
  PER_CLASS: "Per Class",
  REVENUE_PERCENTAGE: "Revenue %",
  MONTHLY_SALARY: "Monthly Salary",
};

export default function GMTeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => { getTeacherProfileGM(id).then(setProfile); }, [id]);

  if (!profile) return <div className="p-8 text-gray-400">Loading…</div>;

  const { teacher, sections, proctorExams, reports } = profile;
  const activeClasses = sections.filter(s => s.courseClass.status === "ACTIVE");
  const completedClasses = sections.filter(s => s.courseClass.status === "COMPLETED");

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/general-manager/teachers" className="text-gray-400 hover:text-gray-600 text-sm">← Teachers</Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{teacher.name}</h1>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{teacher.userId ?? "no ID assigned"}</p>
            {teacher.branch && <p className="text-xs text-gray-500 mt-0.5">{teacher.branch.name}</p>}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${teacher.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {teacher.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
            <p className="mt-1 font-medium text-gray-800">{teacher.email ?? "—"}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Payment</span>
            <p className="mt-1 font-medium text-gray-800">
              {teacher.paymentType ? PAYMENT_LABELS[teacher.paymentType] ?? teacher.paymentType : "—"}
              {teacher.paymentType === "PER_CLASS" && teacher.perClassRate != null && ` · $${teacher.perClassRate}/class`}
              {teacher.paymentType === "REVENUE_PERCENTAGE" && teacher.revenuePercentage != null && ` · ${teacher.revenuePercentage}%`}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Joined</span>
            <p className="mt-1 font-medium text-gray-800">
              {new Date(teacher.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Active Classes */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Active Classes <span className="text-xs font-normal text-gray-400">({activeClasses.length})</span>
        </h2>
        {activeClasses.length === 0 ? (
          <p className="text-sm text-gray-400">No active classes.</p>
        ) : (
          <div className="space-y-2">
            {activeClasses.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.courseClass.courseTemplate.name}</p>
                  <p className="text-xs text-gray-400">
                    Section {s.sectionNumber}{s.sectionName ? ` — ${s.sectionName}` : ""}
                    {" · "}{s.courseClass.branch.name}
                    {" · "}Started {new Date(s.courseClass.startDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </p>
                </div>
                <Link href={`/general-manager/classes/${s.courseClass.id}`}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                  View Class
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Classes */}
      {completedClasses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Completed Classes <span className="text-xs font-normal text-gray-400">({completedClasses.length})</span>
          </h2>
          <div className="space-y-2">
            {completedClasses.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-600">{s.courseClass.courseTemplate.name}</p>
                  <p className="text-xs text-gray-400">
                    Section {s.sectionNumber} · {s.courseClass.branch.name}
                  </p>
                </div>
                <Link href={`/general-manager/classes/${s.courseClass.id}`}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proctored Exams */}
      {proctorExams.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Proctored Exams <span className="text-xs font-normal text-gray-400">({proctorExams.length})</span>
          </h2>
          <div className="space-y-2">
            {proctorExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{exam.title}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${exam.examType === "FINAL" ? "bg-purple-100 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                      {exam.examType === "FINAL" ? "Final" : "Regular"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {exam.courseClass.courseTemplate.name} · {exam.courseClass.branch.name} · {new Date(exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports (read-only) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Reports</h2>
        <ReportsSection reports={reports as Parameters<typeof ReportsSection>[0]["reports"]} />
      </div>
    </div>
  );
}
