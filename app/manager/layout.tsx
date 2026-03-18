import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/manager" },
  { label: "Classes", href: "/manager/classes" },
  { label: "Students", href: "/manager/students" },
  { label: "Attendance", href: "/manager/attendance" },
  { label: "Reports", href: "/manager/reports" },
  { label: "Transactions", href: "/manager/transactions" },
  { label: "Products", href: "/manager/products" },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="Manager" accent="teal">
      {children}
    </DashboardLayout>
  );
}
