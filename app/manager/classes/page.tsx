"use client";

import { useEffect, useState } from "react";
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
        classes={classes}
        onEdit={handleEdit}
        onRefresh={load}
      />
    </div>
  );
}
