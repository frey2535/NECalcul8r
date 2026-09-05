import React, { createContext, useState, useContext, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext();
const AUTH_STARTUP_TIMEOUT_MS = 10000;

function withTimeout(promise, ms, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({
    id: "necalcul8r",
    public_settings: { auth_required: true },
  });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setAuthError(null);
    setIsLoadingPublicSettings(false);
    try {
      const currentUser = await withTimeout(
        base44.auth.me(),
        AUTH_STARTUP_TIMEOUT_MS,
        "Authentication took too long. Refresh the app to load the newest version."
      );
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError(error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout("/landing");
    } else {
      base44.auth.setToken(null);
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
