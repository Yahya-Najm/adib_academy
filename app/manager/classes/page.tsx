"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClasses, getCourseTemplatesForManager, getTeachersForManager } from "../actions/classes";
import ClassForm from "../components/ClassForm";
import ClassesTable from "../components/ClassesTable";

type CourseClass = Awaited<ReturnType<typeof getClasses>>[number];
type Templates = Awaited<ReturnType<typeof getCourseTemplatesForManager>>;
type Teachers = Awaited<ReturnType<typeof getTeachersForManager>>;

export default function ClassesPage() {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [templates, setTemplates] = useState<Templates>([]);
  const [teachers, setTeachers] = useState<Teachers>({ own: [], others: [] });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CourseClass | null>(null);

  async function load() {
    const [c, t, tr] = await Promise.all([
      getClasses(),
      getCourseTemplatesForManager(),
      getTeachersForManager(),
    ]);
    setClasses(c);
    setTemplates(t);
    setTeachers(tr);
  }

  useEffect(() => { load(); }, []);

  function handleEdit(c: CourseClass) {
    setEditItem(c);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditItem(null);
  }

  const activeClasses = classes.filter(c => c.status !== "COMPLETED");
  const completedClasses = classes.filter(c => c.status === "COMPLETED");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Start and manage classes for your branch</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Start Class"}
        </button>
      </div>

      {(showForm || editItem) && (
        <ClassForm
          templates={templates}
          teachers={teachers}
          initial={editItem ?? undefined}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}

      <ClassesTable
        classes={activeClasses}
        onEdit={handleEdit}
        onRefresh={load}
      />

      {completedClasses.length > 0 && (
        <CompletedClassesSection classes={completedClasses} />
      )}
    </div>
  );
}

function CompletedClassesSection({ classes }: { classes: CourseClass[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-4 w-full text-left"
      >
        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
          Completed Classes ({classes.length})
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden opacity-80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {classes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-700">{c.courseTemplate.name}</p>
                    <p className="text-xs text-gray-400">{c.branch.name} · {c.courseTemplate.durationMonths}mo</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(c.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{c.classTime}</td>
                  <td className="px-5 py-3">
                    <div className="space-y-0.5">
                      {c.sections.map(s => (
                        <p key={s.sectionNumber} className="text-xs text-gray-500">
                          <span className="text-gray-400">S{s.sectionNumber}: </span>{s.teacher.name}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/manager/classes/${c.id}`}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
