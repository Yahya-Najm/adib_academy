"use client";

import { useState } from "react";
import { deleteBranch } from "../actions/branches";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  branches: Branch[];
  onEdit: (branch: Branch) => void;
  onRefresh: () => void;
}

export default function BranchesTable({ branches, onEdit, onRefresh }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(id: string) {
    setDeleting(true); setError("");
    try {
      await deleteBranch(id);
      setConfirmId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete branch");
    }
    setDeleting(false);
  }

  if (branches.length === 0)
    return <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">No branches yet. Add your first branch.</div>;

  const confirmBranch = branches.find(b => b.id === confirmId);

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Delete Branch</h3>
            <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete <span className="font-medium text-gray-800">{confirmBranch?.name}</span>?</p>
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
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {branches.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-5 py-3 text-gray-500">{b.address || "—"}</td>
                <td className="px-5 py-3 text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(b)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmId(b.id)}
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
