import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/teacher" },
  { label: "Classes", href: "/teacher/classes" },
  { label: "Attendance", href: "/teacher/attendance" },
  { label: "Reports", href: "/teacher/reports" },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="Teacher" accent="dark">
      {children}
    </DashboardLayout>
  );
}
