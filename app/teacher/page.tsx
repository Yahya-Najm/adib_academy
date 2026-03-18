"use client";

import { useEffect, useState } from "react";
import { getTeacherAnnouncements } from "./actions/announcements";

type Holiday = Awaited<ReturnType<typeof getTeacherAnnouncements>>[number];

export default function TeacherPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    getTeacherAnnouncements().then(setHolidays).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
      <p className="text-gray-500 mt-1">Welcome, Teacher</p>

      <div className="mt-8">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Announcements &amp; Upcoming Holidays</h2>
        {holidays.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-700">
            No upcoming holidays or events.
          </div>
        ) : (
          <div className="space-y-3">
            {holidays.map(h => (
              <div key={h.id} className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{h.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(h.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {h.branch ? ` — ${h.branch.name}` : " — All Branches"}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    No attendance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
