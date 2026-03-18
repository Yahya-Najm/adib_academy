"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getStaffProfile } from "../../actions/teachers";
import { markReportDone } from "../../actions/reports";
import ReportsSection from "@/components/reports/ReportsSection";

type Profile = Awaited<ReturnType<typeof getStaffProfile>>;

function attendanceStatus(a: { present: boolean; isLate: boolean }) {
  if (!a.present) return { label: "Absent", cls: "bg-red-100 text-red-700" };
  if (a.isLate) return { label: "Late", cls: "bg-yellow-100 text-yellow-700" };
  return { label: "Present", cls: "bg-green-100 text-green-700" };
}

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();

  async function load() {
    setProfile(await getStaffProfile(id));
  }

  useEffect(() => { load(); }, [id]);

  function handleMarkDone(reportId: string, done: boolean) {
    startTransition(async () => {
      await markReportDone(reportId, done);
      load();
    });
  }

  if (!profile) return <div className="p-8 text-gray-400">Loading…</div>;

  const { staff, attendances, reports } = profile;

  // Attendance summary
  const presentCount = attendances.filter(a => a.present && !a.isLate).length;
  const lateCount = attendances.filter(a => a.present && a.isLate).length;
  const absentCount = attendances.filter(a => !a.present).length;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/manager/staff" className="text-gray-400 hover:text-gray-600 text-sm">← Staff</Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{staff.name}</h1>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{staff.userId ?? "no ID assigned"}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${staff.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {staff.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Role</span>
            <p className="mt-1 font-medium text-gray-800">{staff.staffType ?? "—"}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
            <p className="mt-1 font-medium text-gray-800">{staff.email ?? "—"}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Salary</span>
            <p className="mt-1 font-medium text-gray-800">
              {staff.monthlySalary != null ? `$${staff.monthlySalary}` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Joined</span>
            <p className="mt-1 font-medium text-gray-800">
              {new Date(staff.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Attendance
          <span className="ml-2 text-xs font-normal text-gray-400">last {attendances.length} records</span>
        </h2>

        {attendances.length === 0 ? (
          <p className="text-sm text-gray-400">No attendance records yet.</p>
        ) : (
          <>
            {/* Summary pills */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <span className="text-sm font-bold text-green-700">{presentCount}</span>
                <span className="text-xs text-green-600">Present</span>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <span className="text-sm font-bold text-yellow-700">{lateCount}</span>
                <span className="text-xs text-yellow-600">Late</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span className="text-sm font-bold text-red-700">{absentCount}</span>
                <span className="text-xs text-red-600">Absent</span>
              </div>
            </div>

            {/* Recent records table */}
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendances.slice(0, 30).map(a => {
                    const st = attendanceStatus(a);
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">
                          {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Reports */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Reports</h2>
        <ReportsSection
          reports={reports as Parameters<typeof ReportsSection>[0]["reports"]}
          onMarkDone={handleMarkDone}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
