import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import * as authApi from '../services/authApi';
import { setUnauthorizedHandler } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the first "who am I?" answer
  const [sessionExpired, setSessionExpired] = useState(false);

  // On page load (and refresh), ask the backend who we are. The cookie does the proof.
  useEffect(() => {
    let active = true;
    authApi
      .getMe()
      .then((u) => active && setUser(u))
      .catch(() => active && setUser(null)) // not logged in (a 401 here is normal)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // If any later request gets a 401, the session ended: clear the user
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const u = await authApi.login(credentials);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const u = await authApi.register(payload);
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the request fails, forget the user on this screen
    } finally {
      setUser(null);
      setSessionExpired(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionExpired, login, register, logout }),
    [user, loading, sessionExpired, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}