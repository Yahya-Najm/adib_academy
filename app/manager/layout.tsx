import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/manager" },
  { label: "Classes", href: "/manager/classes" },
  { label: "Students", href: "/manager/students" },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="Manager" accent="teal">
      {children}
    </DashboardLayout>
  );
}
