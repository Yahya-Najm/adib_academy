import DashboardLayout from "@/components/dashboard/DashboardLayout";

const nav = [
  { label: "Overview", href: "/general-manager" },
  { label: "Branches", href: "/general-manager/branches" },
  { label: "Managers", href: "/general-manager/managers" },
  { label: "Teachers", href: "/general-manager/teachers" },
  { label: "Staff", href: "/general-manager/staff" },
];

export default function GeneralManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout nav={nav} role="General Manager" accent="orange">
      {children}
    </DashboardLayout>
  );
}
