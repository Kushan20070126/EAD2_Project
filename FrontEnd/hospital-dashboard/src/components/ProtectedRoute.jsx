import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api/axios";
import {
  clearAuthToken,
  getAuthToken,
  getHomePathForRole,
  getUserRole,
  normalizeRole,
  setUserContext,
} from "../utils/auth";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const [isValidSession, setIsValidSession] = useState(() =>
    getAuthToken() ? null : false
  );
  const [role, setRole] = useState(getUserRole());

  useEffect(() => {
    let isMounted = true;
    const token = getAuthToken();

    if (!token) {
      return () => {};
    }

    const validateSession = async () => {
      try {
        const res = await API.get("/auth-service/auth/validate-token");

        if (!isMounted) {
          return;
        }

        if (res.data?.valid) {
          const tokenRole = normalizeRole(res.data?.role);
          const tokenEmail = res.data?.email || "";

          setUserContext({ role: tokenRole, email: tokenEmail });
          setRole(tokenRole);
          setIsValidSession(true);
        } else {
          clearAuthToken();
          setIsValidSession(false);
        }
      } catch {
        if (isMounted) {
          clearAuthToken();
          setIsValidSession(false);
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Checking session...
      </div>
    );
  }

  if (!isValidSession) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizeRole(role))) {
    return <Navigate to={getHomePathForRole(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
