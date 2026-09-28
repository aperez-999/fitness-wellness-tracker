import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMe,
  getToken,
  TOKEN_KEY,
  login as apiLogin,
  logout as apiLogout,
  setToken,
  signup as apiSignup,
  updateProfile as apiUpdateProfile,
} from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { user: currentUser } = await getMe();
      if (getToken() === token) setUser(currentUser);
    } catch {
      if (getToken() === token) {
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    } finally {
      if (getToken() === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== TOKEN_KEY && event.key !== null) return;
      setUser(null);
      setLoading(true);
      loadUser();
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadUser]);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedInUser } = await apiLogin(credentials);
    setToken(token);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (payload) => {
    const { token, user: newUser } = await apiSignup(payload);
    setToken(token);
    setUser(newUser);
    return newUser;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const token = getToken();
    const { user: updated } = await apiUpdateProfile(payload);
    if (getToken() === token) setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(() => {
    // Start the request with the current token, then clear the session immediately.
    void apiLogout().catch(() => {});
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      updateProfile,
    }),
    [user, loading, login, signup, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
