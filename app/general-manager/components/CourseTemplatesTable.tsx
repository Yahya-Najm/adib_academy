"use client";

import { useState } from "react";
import { deleteCourseTemplate } from "../actions/courseTemplates";

interface CourseTemplate {
  id: string;
  name: string;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  monthlyFee: number;
  durationMonths: number;
  numSections: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  templates: CourseTemplate[];
  onEdit: (t: CourseTemplate) => void;
  onRefresh: () => void;
}

export default function CourseTemplatesTable({ templates, onEdit, onRefresh }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    setDeleting(true);
    setError("");
    try {
      await deleteCourseTemplate(id);
      setConfirmId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
    setDeleting(false);
  }

  if (templates.length === 0)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        No course templates yet. Create your first template.
      </div>
    );

  const confirmItem = templates.find(t => t.id === confirmId);

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Course Template</h3>
            <p className="text-sm text-gray-500 mb-1">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-800">{confirmItem?.name}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-4">This cannot be undone.</p>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(confirmId)} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => { setConfirmId(null); setError(""); }}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Fee</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sections</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {templates.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
                <td className="px-5 py-3 text-gray-500">
                  {t.branch ? (
                    t.branch.name
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-600">
                      All Branches
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700 font-medium">
                  {t.monthlyFee.toLocaleString()} AFN
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {t.durationMonths} {t.durationMonths === 1 ? "month" : "months"}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                    {t.numSections}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmId(t.id)}
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
