import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/manager" },
  { label: "Teachers", href: "/manager/teachers" },
  { label: "Schedule", href: "/manager/schedule" },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="Manager" accent="teal">
      {children}
    </DashboardLayout>
  );
}
