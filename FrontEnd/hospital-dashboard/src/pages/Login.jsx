import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import {
  extractEmail,
  extractRefreshToken,
  extractRole,
  extractToken,
  getHomePathForRole,
  getAuthToken,
  getUserRole,
  setAuthSession,
} from "../utils/auth";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAuthToken()) {
      navigate(getHomePathForRole(getUserRole()), { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      const res = await API.post("/auth-service/auth/login", {
        email: normalizedEmail,
        password: form.password,
      });

      const token = extractToken(res.data);

      if (!token) {
        throw new Error("No token was returned from auth service");
      }

      const role = extractRole(res.data);
      const email = extractEmail(res.data);

      setAuthSession(token, extractRefreshToken(res.data), { role, email });
      navigate(getHomePathForRole(role));
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.message;

      if (status === 401 || status === 403) {
        setError(serverMessage || "Invalid email or password.");
      } else {
        setError(serverMessage || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-center bg-slate-900 p-10 text-white md:flex">
          <h1 className="text-4xl font-bold">MediCink</h1>
          <p className="mt-4 text-lg text-slate-300">
            Professional hospital management dashboard for patients, doctors,
            appointments, and queue operations.
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mx-auto max-w-md">
            <h2 className="text-3xl font-bold text-slate-800">Sign in</h2>
            <p className="mt-2 text-slate-500">Access your admin dashboard</p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-600">
              New user?{" "}
              <Link
                to="/register"
                className="font-semibold text-blue-600 hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
