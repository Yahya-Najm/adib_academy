"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClassesGM, getBranchesGM } from "../actions/classes";

type CourseClass = Awaited<ReturnType<typeof getClassesGM>>[number];
type Branch = Awaited<ReturnType<typeof getBranchesGM>>[number];

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function GMClassesPage() {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBranchesGM().then(setBranches);
    getClassesGM().then(data => { setClasses(data); setLoading(false); });
  }, []);

  useEffect(() => {
    setLoading(true);
    getClassesGM(branchFilter || undefined).then(data => { setClasses(data); setLoading(false); });
  }, [branchFilter]);

  const activeClasses = classes.filter(c => c.status !== "COMPLETED");
  const completedClasses = classes.filter(c => c.status === "COMPLETED");

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 text-sm mt-0.5">All classes across branches</p>
        </div>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-10">Loading…</div>
      ) : (
        <>
          <ClassTable classes={activeClasses} title="Active Classes" />

          {completedClasses.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
                Completed Classes ({completedClasses.length})
              </p>
              <ClassTable classes={completedClasses} muted />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClassTable({ classes, title, muted }: { classes: CourseClass[]; title?: string; muted?: boolean }) {
  if (classes.length === 0) {
    return title ? (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
        No {title?.toLowerCase()}.
      </div>
    ) : null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${muted ? "opacity-80" : ""}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
            <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {classes.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-5 py-3">
                <p className={`font-medium ${muted ? "text-gray-600" : "text-gray-900"}`}>{c.courseTemplate.name}</p>
                <p className="text-xs text-gray-400">{c.courseTemplate.durationMonths}mo</p>
              </td>
              <td className="px-5 py-3 text-gray-500 text-xs">{c.branch.name}</td>
              <td className="px-5 py-3 text-gray-500">
                {new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="px-5 py-3">
                <div className="space-y-0.5">
                  {c.sections.map(s => (
                    <p key={s.sectionNumber} className="text-xs text-gray-500">
                      <span className="text-gray-400">S{s.sectionNumber}: </span>{s.teacher.name}
                    </p>
                  ))}
                </div>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? ""}`}>
                  {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                <Link
                  href={`/general-manager/classes/${c.id}`}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
