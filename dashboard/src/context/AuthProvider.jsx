import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AuthContext from "./authContextInstance";

import {
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../api/authApi";

function normalizeRole(role = "") {
  const normalized = String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    normalized === "teamlead" ||
    normalized === "team_lead"
  ) {
    return "team_lead";
  }

  if (normalized === "administrator") {
    return "admin";
  }

  return normalized;
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem("token")
  );

  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("user");

      if (!savedUser) {
        return null;
      }

      return normalizeUser(
        JSON.parse(savedUser)
      );
    } catch {
      return null;
    }
  });

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  // ==========================================
  // CLEAR AUTH
  // ==========================================

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }, []);

  // ==========================================
  // RESTORE SESSION
  // ==========================================

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const savedToken =
        localStorage.getItem("token");

      if (!savedToken) {
        if (active) {
          setIsAuthLoading(false);
        }

        return;
      }

      try {
        const response =
          await getCurrentUser();

        const currentUser =
          normalizeUser(
            response?.user || response
          );

        if (!currentUser) {
          throw new Error(
            "User information was not returned."
          );
        }

        if (!active) {
          return;
        }

        setToken(savedToken);
        setUser(currentUser);

        localStorage.setItem(
          "user",
          JSON.stringify(currentUser)
        );
      } catch (error) {
        console.error(
          "Session validation failed:",
          error
        );

        if (active) {
          clearAuth();
        }
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [clearAuth]);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = async (
    email,
    password
  ) => {
    const response = await loginUser({
      email,
      password,
    });

    const newToken =
      response?.token;

    const loggedInUser =
      normalizeUser(response?.user);

    if (
      !newToken ||
      !loggedInUser
    ) {
      throw new Error(
        "Invalid login response from server."
      );
    }

    localStorage.setItem(
      "token",
      newToken
    );

    localStorage.setItem(
      "user",
      JSON.stringify(loggedInUser)
    );

    setToken(newToken);
    setUser(loggedInUser);

    return loggedInUser;
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      if (
        localStorage.getItem("token")
      ) {
        await logoutUser();
      }
    } catch (error) {
      console.error(
        "Backend logout failed:",
        error
      );
    } finally {
      clearAuth();
    }
  };

  const value = {
    user,
    token,

    isAuthenticated: Boolean(
      token && user
    ),

    isAuthLoading,

    login,
    logout,
    clearAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };