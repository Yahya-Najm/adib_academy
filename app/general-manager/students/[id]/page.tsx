"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStudentGM, getStudentExamScoresGM } from "../../actions/students";
import { getReportsForSubjectGM } from "../../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";
import { EducationLevel } from "@prisma/client";

type Student = Awaited<ReturnType<typeof getStudentGM>>;
type StudentReport = Awaited<ReturnType<typeof getReportsForSubjectGM>>[number];
type ExamScore = Awaited<ReturnType<typeof getStudentExamScoresGM>>[number];

const EDU_LABELS: Record<EducationLevel, string> = {
  BELOW_GRADE_6: "Below Grade 6",
  GRADE_6_AND_ABOVE: "Grade 6 and Above",
  SCHOOL_GRADUATE: "School Graduate",
  BACHELOR: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  OTHER: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700",
};

function currentMonth(startDate: Date | string, durationMonths: number) {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  return Math.min(Math.max(diffMonths + 1, 1), durationMonths);
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <p className="mt-1 text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

export default function GMStudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);

  useEffect(() => {
    getStudentGM(id).then(setStudent);
    getReportsForSubjectGM("STUDENT", id).then(setReports).catch(() => {});
    getStudentExamScoresGM(id).then(setExamScores).catch(() => {});
  }, [id]);

  if (!student) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/general-manager/students" className="text-gray-400 hover:text-gray-600 text-sm">← All Students</Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{student.branch?.name ?? "No branch"} · {EDU_LABELS[student.education]}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${student.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {student.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="First Name" value={student.firstName} />
          <InfoRow label="Last Name" value={student.lastName} />
          <InfoRow label="Age" value={String(student.age)} />
          <InfoRow label="Phone" value={student.phone} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Address" value={student.address} />
          <InfoRow label="Parent Phone 1" value={student.parentPhone1} />
          <InfoRow label="Parent Phone 2" value={student.parentPhone2} />
          <div className="col-span-2">
            <InfoRow label="Education Level" value={EDU_LABELS[student.education]} />
          </div>
        </div>
      </div>

      {student.enrollments.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-gray-800">Classes & Payments</h2>
          {student.enrollments.map(enrollment => {
            const tmpl = enrollment.courseClass.courseTemplate;
            const month = currentMonth(enrollment.courseClass.startDate, tmpl.durationMonths);
            return (
              <div key={enrollment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900">{tmpl.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Branch: {enrollment.courseClass.branch?.name} · Started {new Date(enrollment.courseClass.startDate).toLocaleDateString()} · Month {month} of {tmpl.durationMonths}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${enrollment.status === "ACTIVE" ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"}`}>
                    {enrollment.status}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Month", "Due Date", "Amount", "Status", "Paid On"].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrollment.monthlyPayments.map(p => (
                      <tr key={p.id} className={p.monthNumber === month ? "bg-orange-50/20" : ""}>
                        <td className="px-4 py-2 text-gray-700">
                          Month {p.monthNumber}
                          {p.monthNumber === month && <span className="ml-1 text-xs text-orange-500 font-medium">(current)</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{new Date(p.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-gray-800 font-medium">${p.amount}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-8 bg-white border border-gray-200 rounded-xl">
          Not enrolled in any classes
        </div>
      )}

      {/* Exam Scores */}
      {examScores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Exam Scores</h2>
          <div className="space-y-2">
            {examScores.map(sc => {
              const isFinal = sc.exam.examType === "FINAL";
              return (
                <div key={sc.id} className={`flex items-center justify-between border rounded-lg px-4 py-3 ${isFinal ? "border-purple-200 bg-purple-50" : "border-gray-200"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      {isFinal && (
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Final</span>
                      )}
                      <p className="text-sm font-medium text-gray-900">{sc.exam.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sc.exam.courseClass.courseTemplate.name}
                      {sc.exam.courseClass.branch && ` · ${sc.exam.courseClass.branch.name}`}
                      {" · "}{new Date(sc.exam.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${isFinal ? "text-purple-700" : "text-teal-700"}`}>{sc.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Reports</h2>
        <ReportsSection reports={reports as Parameters<typeof ReportsSection>[0]["reports"]} />
      </div>
    </div>
  );
}
