"use client";

import { useEffect, useState } from "react";
import { getCourseTemplates } from "../actions/courseTemplates";
import { getBranches } from "../actions/branches";
import CourseTemplateForm from "../components/CourseTemplateForm";
import CourseTemplatesTable from "../components/CourseTemplatesTable";

type CourseTemplate = Awaited<ReturnType<typeof getCourseTemplates>>[number];
type Branch = Awaited<ReturnType<typeof getBranches>>[number];

export default function CourseTemplatesPage() {
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CourseTemplate | null>(null);

  async function load() {
    const [t, b] = await Promise.all([getCourseTemplates(), getBranches()]);
    setTemplates(t);
    setBranches(b);
  }

  useEffect(() => { load(); }, []);

  function handleEdit(t: CourseTemplate) {
    setEditItem(t);
    setShowForm(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditItem(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Templates</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Define course modules — name, fees, duration, and section structure
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null); }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Template"}
        </button>
      </div>

      {(showForm || editItem) && (
        <CourseTemplateForm
          initial={editItem ?? undefined}
          branches={branches}
          onSuccess={() => { closeForm(); load(); }}
          onCancel={closeForm}
        />
      )}

      <CourseTemplatesTable
        templates={templates}
        onEdit={handleEdit}
        onRefresh={load}
      />
    </div>
  );
}
