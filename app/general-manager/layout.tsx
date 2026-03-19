import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/general-manager" },
  { label: "Branches", href: "/general-manager/branches" },
  { label: "Managers", href: "/general-manager/managers" },
  { label: "Teachers", href: "/general-manager/teachers" },
  { label: "Staff", href: "/general-manager/staff" },
  { label: "Course Templates", href: "/general-manager/course-templates" },
  { label: "Classes", href: "/general-manager/classes" },
  { label: "Students", href: "/general-manager/students" },
  { label: "Products", href: "/general-manager/products" },
  { label: "Holidays", href: "/general-manager/holidays" },
  { label: "Reports", href: "/general-manager/reports" },
  { label: "Financials", href: "/general-manager/financials" },
];

export default function GeneralManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="General Manager" accent="orange">
      {children}
    </DashboardLayout>
  );
}
