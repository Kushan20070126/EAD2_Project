import { Link, useLocation } from "react-router-dom";
import { getUserRole } from "../utils/auth";

function Sidebar() {
  const location = useLocation();
  const role = getUserRole();

  const allLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Patients", path: "/patients" },
    { name: "Doctors", path: "/doctors" },
    { name: "Appointments", path: "/appointments" },
    { name: "Queue", path: "/queue" },
  ];

  const links = allLinks.filter((link) => {
    if (role === "ADMIN") {
      return true;
    }

    if (role === "DOCTOR") {
      return link.path === "/queue";
    }

    if (role === "PATIENT") {
      return link.path === "/appointments" || link.path === "/queue";
    }

    return false;
  });

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-6 py-5">
        <h1 className="text-2xl font-bold">MediCink</h1>
        <p className="text-sm text-slate-300">Hospital Dashboard</p>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {links.map((link) => {
          const active = location.pathname === link.path;

          return (
            <Link
              key={link.path}
              to={link.path}
              className={`block rounded-lg px-4 py-3 font-medium ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-200 hover:bg-slate-800"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
