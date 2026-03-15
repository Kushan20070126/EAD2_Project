import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout({ title, children }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-4 md:p-6">
        <Navbar title={title} />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
