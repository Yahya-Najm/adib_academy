import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getPublicData() {
  const [branches, courseTemplates, activeClasses] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.courseTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.courseClass.findMany({
      where: { status: "ACTIVE" },
      include: {
        courseTemplate: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: [{ branch: { name: "asc" } }, { classTime: "asc" }],
    }),
  ]);
  return { branches, courseTemplates, activeClasses };
}

export default async function HomePage() {
  const [session, { branches, courseTemplates, activeClasses }] =
    await Promise.all([auth(), getPublicData()]);

  const classesByBranch: Record<string, typeof activeClasses> = {};
  for (const cls of activeClasses) {
    const bn = cls.branch.name;
    if (!classesByBranch[bn]) classesByBranch[bn] = [];
    classesByBranch[bn].push(cls);
  }

  const dashboardRoute =
    session?.user?.role === "GENERAL_MANAGER"
      ? "/general-manager"
      : session?.user?.role === "MANAGER"
      ? "/manager"
      : session?.user?.role === "TEACHER"
      ? "/teacher"
      : "/dashboard";

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#" className="text-xl font-bold text-orange-500 tracking-tight select-none">
            Adib Academy
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            <a href="#about" className="hover:text-orange-500 transition-colors">About</a>
            <a href="#branches" className="hover:text-orange-500 transition-colors">Branches</a>
            <a href="#courses" className="hover:text-orange-500 transition-colors">Courses</a>
            <a href="#schedule" className="hover:text-orange-500 transition-colors">Schedule</a>
          </nav>

          {session ? (
            <Link
              href={dashboardRoute}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-14">
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-500 mb-3 uppercase tracking-widest">
            Welcome
          </p>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Learn. Grow.<br />
            <span className="text-orange-500">Succeed.</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-lg">
            Adib Academy provides structured, high-quality courses across multiple branches —
            led by experienced teachers committed to your progress.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#courses"
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Explore Courses
            </a>
            <a
              href="#branches"
              className="border border-gray-300 hover:border-orange-400 text-gray-700 hover:text-orange-500 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Our Branches
            </a>
          </div>
        </div>

        <div className="flex-1 flex justify-center w-full">
          <div className="w-full max-w-md h-80 bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-3">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium">Academy Photo</span>
            <span className="text-xs text-gray-300">Replace with your image</span>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">About Us</h2>
          <div className="w-12 h-1 bg-orange-500 mb-7 rounded-full" />
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <p className="md:col-span-2 text-gray-600 text-lg leading-relaxed">
              Adib Academy is a dedicated educational institution offering structured programmes
              across a range of disciplines. With motivated teachers, thoughtfully designed
              curricula, and branches spread across the community, we give every student the
              tools to learn, grow, and reach their potential.
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
                <p className="text-3xl font-bold text-orange-500">{branches.length}</p>
                <p className="text-sm text-gray-500 mt-1">Branches</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
                <p className="text-3xl font-bold text-orange-500">{courseTemplates.length}</p>
                <p className="text-sm text-gray-500 mt-1">Courses</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm text-center">
                <p className="text-3xl font-bold text-orange-500">{activeClasses.length}</p>
                <p className="text-sm text-gray-500 mt-1">Active Classes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Branches ── */}
      <section id="branches" className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Our Branches</h2>
          <div className="w-12 h-1 bg-orange-500 mb-10 rounded-full" />
          {branches.length === 0 ? (
            <p className="text-gray-400">No branches listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{branch.address}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Courses ── */}
      <section id="courses" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Courses We Offer</h2>
          <div className="w-12 h-1 bg-orange-500 mb-10 rounded-full" />
          {courseTemplates.length === 0 ? (
            <p className="text-gray-400">No courses listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseTemplates.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                  {course.branchId === null && (
                    <span className="mt-1 text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full w-fit">
                      All Branches
                    </span>
                  )}
                  <div className="mt-4 space-y-2 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Monthly Fee</span>
                      <span className="font-semibold text-gray-900">${course.monthlyFee}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-medium text-gray-700">{course.durationMonths} months</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Sections</span>
                      <span className="font-medium text-gray-700">{course.numSections}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Schedule ── */}
      <section id="schedule" className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Class Schedule</h2>
          <div className="w-12 h-1 bg-orange-500 mb-10 rounded-full" />
          {activeClasses.length === 0 ? (
            <p className="text-gray-400">No active classes scheduled at this time.</p>
          ) : (
            <div className="space-y-10">
              {Object.entries(classesByBranch).map(([branchName, classes]) => (
                <div key={branchName}>
                  <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                    {branchName}
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-5 py-3 font-medium text-gray-600">Course</th>
                          <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Class ID</th>
                          <th className="text-left px-5 py-3 font-medium text-gray-600">Time</th>
                          <th className="text-left px-5 py-3 font-medium text-gray-600 hidden md:table-cell">Start Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {classes.map((cls) => (
                          <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {cls.courseTemplate.name}
                            </td>
                            <td className="px-5 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">
                              {cls.classId}
                            </td>
                            <td className="px-5 py-3 text-gray-700">{cls.classTime}</td>
                            <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                              {new Date(cls.startDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <span className="text-xl font-bold text-orange-400">Adib Academy</span>
              <p className="mt-3 text-sm leading-relaxed max-w-xs">
                Dedicated to quality education across all our branches.
                Empowering students every step of the way.
              </p>
            </div>

            {branches.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-4">Our Branches</p>
                <ul className="space-y-3 text-sm">
                  {branches.map((b) => (
                    <li key={b.id}>
                      <span className="text-gray-300">{b.name}</span>
                      <br />
                      <span className="text-gray-500 text-xs">{b.address}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-300 mb-4">Quick Links</p>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-orange-400 transition-colors">About</a></li>
                <li><a href="#branches" className="hover:text-orange-400 transition-colors">Branches</a></li>
                <li><a href="#courses" className="hover:text-orange-400 transition-colors">Courses</a></li>
                <li><a href="#schedule" className="hover:text-orange-400 transition-colors">Schedule</a></li>
                <li>
                  <Link href="/login" className="hover:text-orange-400 transition-colors">
                    Staff Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-xs text-gray-600">
            © {new Date().getFullYear()} Adib Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
