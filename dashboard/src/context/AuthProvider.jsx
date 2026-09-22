import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AuthContext from "./authContextInstance";

import {
  loginUser,
  quickLoginUser,
  getCurrentUser,
  logoutUser,
  waitForLoginApproval,
} from "../api/authApi";
import { stopTimer } from "../api/timerApi";

function normalizeRole(role = "") {
  const normalized = String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    normalized === "tl" ||
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
  const [loginApprovalMessage, setLoginApprovalMessage] = useState("");

  const [rememberedUser, setRememberedUser] = useState(() => {
    try { return normalizeUser(JSON.parse(localStorage.getItem("rememberedUser"))); } catch { return null; }
  });

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

  const resolveLoginAttempt = async (attempt) => {
    setLoginApprovalMessage("");
    try {
      return await attempt();
    } catch (error) {
      const pending = error?.response?.status === 409
        && error?.response?.data?.code === "DEVICE_APPROVAL_REQUIRED"
        && error?.response?.data?.loginRequest;
      if (!pending) throw error;
      setLoginApprovalMessage(`Waiting for approval on ${pending.activeDevice?.deviceName || "the active device"}...`);
      while (true) {
        const response = await waitForLoginApproval(pending);
        if (response?.code === "DEVICE_APPROVAL_PENDING") continue;
        setLoginApprovalMessage("");
        return response;
      }
    }
  };

  const login = async (
    email,
    password
  ) => {
    const response = await resolveLoginAttempt(() => loginUser({
      email,
      password,
    }));

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

    if (response.rememberedSessionToken) {
      localStorage.setItem("rememberedSessionToken", response.rememberedSessionToken);
      localStorage.setItem("rememberedUser", JSON.stringify(loggedInUser));
      setRememberedUser(loggedInUser);
    }

    setToken(newToken);
    setUser(loggedInUser);

    return loggedInUser;
  };

  const quickLogin = async () => {
    const rememberedSessionToken = localStorage.getItem("rememberedSessionToken");
    if (!rememberedSessionToken) throw new Error("No remembered session is available.");
    try {
      const response = await resolveLoginAttempt(() => quickLoginUser(rememberedSessionToken));
      const loggedInUser = normalizeUser(response?.user);
      if (!response?.token || !response?.rememberedSessionToken || !loggedInUser) throw new Error("Invalid quick login response from server.");
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      localStorage.setItem("rememberedSessionToken", response.rememberedSessionToken);
      localStorage.setItem("rememberedUser", JSON.stringify(loggedInUser));
      setToken(response.token);
      setUser(loggedInUser);
      setRememberedUser(loggedInUser);
      return loggedInUser;
    } catch (error) {
      if ([401, 410].includes(error?.response?.status)) {
        localStorage.removeItem("rememberedSessionToken");
        localStorage.removeItem("rememberedUser");
        setRememberedUser(null);
      }
      throw error;
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = async () => {
    try {
      if (
        localStorage.getItem("token")
      ) {
        try { await stopTimer(); } catch (timerError) {
          if (timerError?.response?.status !== 404) throw timerError;
        }
        await logoutUser();
      }
    } catch (error) {
      if ([401, 403].includes(error?.response?.status)) {
        clearAuth();
        return;
      }
      console.error("Logout was deferred until the timer can be finalized:", error);
      throw error;
    }
    clearAuth();
  };

  const value = {
    user,
    token,

    isAuthenticated: Boolean(
      token && user
    ),

    isAuthLoading,

    login,
    quickLogin,
    rememberedUser,
    loginApprovalMessage,
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
