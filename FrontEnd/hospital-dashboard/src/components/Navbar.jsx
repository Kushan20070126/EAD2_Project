import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { clearAuthToken, getRefreshToken } from "../utils/auth";

function Navbar({ title }) {
  const navigate = useNavigate();

  const logout = async () => {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await API.post("/auth-service/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout API failed", error);
    } finally {
      clearAuthToken();
      navigate("/login");
    }
  };

  return (
    <header className="flex items-center justify-between rounded-xl bg-white px-6 py-4 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">Welcome to the hospital panel</p>
      </div>

      <button
        onClick={logout}
        className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white hover:bg-red-600"
      >
        Logout
      </button>
    </header>
  );
}

export default Navbar;
