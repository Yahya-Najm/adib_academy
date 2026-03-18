"use client";

import { useState } from "react";
import Link from "next/link";
import { ClassStatus } from "@prisma/client";
import { deleteClass } from "../actions/classes";
import ExamsPanel from "./ExamsPanel";

interface ClassSection {
  id: string;
  sectionNumber: number;
  sectionName: string | null;
  teacherId: string;
  courseClassId: string;
  createdAt: Date;
  updatedAt: Date;
  teacher: { id: string; name: string };
}

interface CourseClass {
  id: string;
  courseTemplateId: string;
  branchId: string;
  managerId: string;
  startDate: Date;
  classTime: string;
  offDays: string[];
  status: ClassStatus;
  createdAt: Date;
  updatedAt: Date;
  courseTemplate: { name: string; numSections: number; durationMonths: number; monthlyFee: number };
  branch: { name: string };
  sections: ClassSection[];
  exams: { id: string; title: string; date: Date; description: string | null; courseClassId: string; examType: import("@prisma/client").ExamType; classMonth: number | null; proctorId: string | null; scoringFinalized: boolean; scoringFinalizedAt: Date | null; scoringFinalizedById: string | null; createdAt: Date; updatedAt: Date }[];
}

interface Props {
  classes: CourseClass[];
  onEdit: (c: CourseClass) => void;
  onRefresh: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function ClassesTable({ classes, onEdit, onRefresh }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [examsFor, setExamsFor] = useState<{ id: string; name: string } | null>(null);

  async function handleDelete(id: string) {
    setDeleting(true); setDeleteError("");
    try {
      await deleteClass(id);
      setConfirmId(null);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete class");
    }
    setDeleting(false);
  }

  if (classes.length === 0)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        No classes yet. Start your first class.
      </div>
    );

  const confirmItem = classes.find(c => c.id === confirmId);

  return (
    <>
      {/* Delete confirmation */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Class</h3>
            <p className="text-sm text-gray-500 mb-1">
              Delete <span className="font-medium text-gray-800">{confirmItem?.courseTemplate.name}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-4">All sections and exams will be removed.</p>
            {deleteError && <p className="text-xs text-red-500 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => handleDelete(confirmId)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button onClick={() => { setConfirmId(null); setDeleteError(""); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exams modal */}
      {examsFor && (
        <ExamsPanel
          courseClassId={examsFor.id}
          className={examsFor.name}
          onClose={() => { setExamsFor(null); onRefresh(); }}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Off Days</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Exams</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {classes.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{c.courseTemplate.name}</p>
                  <p className="text-xs text-gray-400">{c.branch.name} · {c.courseTemplate.durationMonths}mo</p>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-gray-500">{c.classTime}</td>
                <td className="px-5 py-3 text-gray-500">
                  {c.offDays.length === 0
                    ? <span className="text-gray-300">—</span>
                    : c.offDays.map(d => d.slice(0, 3)).join(", ")
                  }
                </td>
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    {c.sections.map(s => (
                      <p key={s.sectionNumber} className="text-xs text-gray-600">
                        <span className="text-gray-400">S{s.sectionNumber}{s.sectionName ? ` (${s.sectionName})` : ""}: </span>
                        {s.teacher.name}
                      </p>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => setExamsFor({ id: c.id, name: c.courseTemplate.name })}
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                  >
                    {c.exams.length > 0 ? `${c.exams.length} exam${c.exams.length > 1 ? "s" : ""}` : "+ Exams"}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[c.status] ?? ""}`}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/manager/classes/${c.id}`}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition-colors"
                    >
                      View
                    </Link>
                    <button onClick={() => onEdit(c)}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button onClick={() => setConfirmId(c.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
