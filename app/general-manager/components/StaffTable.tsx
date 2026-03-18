"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteStaff } from "../actions/staff";

interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  staffType: string | null;
  branchId: string | null;
  branch: { name: string } | null;
  monthlySalary: number | null;
  createdAt: Date;
}

interface Props {
  staff: StaffMember[];
  onEdit: (member: StaffMember) => void;
  onRefresh: () => void;
}

export default function StaffTable({ staff, onEdit, onRefresh }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    setDeleting(true); setError("");
    try {
      await deleteStaff(id);
      setConfirmId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete staff member");
    }
    setDeleting(false);
  }

  if (staff.length === 0)
    return <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">No staff members yet.</div>;

  const confirmMember = staff.find(s => s.id === confirmId);

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Staff Member</h3>
            <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete <span className="font-medium text-gray-800">{confirmMember?.name}</span>?</p>
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
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Salary</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-5 py-3 text-gray-500">{s.staffType || "—"}</td>
                <td className="px-5 py-3 text-gray-500">{s.branch?.name || "—"}</td>
                <td className="px-5 py-3 text-gray-500">{s.monthlySalary != null ? `$${s.monthlySalary.toLocaleString()}` : "—"}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/general-manager/staff/${s.id}`}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => onEdit(s)}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmId(s.id)}
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
