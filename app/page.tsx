import Link from "next/link";

const roles = [
  {
    title: "General Manager",
    href: "/general-manager",
    border: "border-orange-400",
    text: "text-orange-500",
    hover: "hover:bg-orange-50",
    description: "Academy oversight, branches & users",
  },
  {
    title: "Manager",
    href: "/manager",
    border: "border-teal-400",
    text: "text-teal-600",
    hover: "hover:bg-teal-50",
    description: "Staff, schedules & classes",
  },
  {
    title: "Teacher",
    href: "/teacher",
    border: "border-gray-400",
    text: "text-gray-700",
    hover: "hover:bg-gray-50",
    description: "Classes, students & assignments",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center gap-10 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Adib Academy</h1>
        <p className="text-gray-400 mt-2 text-sm">Select your role to continue</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        {roles.map((role) => (
          <Link
            key={role.href}
            href={role.href}
            className={`border-2 ${role.border} ${role.hover} rounded-2xl px-8 py-6 w-56 text-center transition-colors`}
          >
            <p className={`text-lg font-semibold ${role.text}`}>{role.title}</p>
            <p className="text-xs mt-1.5 text-gray-400">{role.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
