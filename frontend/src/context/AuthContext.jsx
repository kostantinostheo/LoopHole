import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;

    api('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setInitializing(false));
  }, []);

  // Auth and email responses carry a fresh token; the rest only the user.
  function applySession(data) {
    if (data.token) setToken(data.token);
    setUser(data.user);
  }

  const auth = {
    user,
    initializing,

    login: (email, password) =>
      api('/api/auth/login', 'POST', { email, password, timezone: browserTimezone() }).then(applySession),

    register: (email, password) =>
      api('/api/auth/register', 'POST', { email, password, timezone: browserTimezone() }).then(applySession),

    logout() {
      setToken(null);
      setUser(null);
    },

    // field: 'email' | 'currency' | 'timezone'
    updateAccount: (field, value) =>
      api(`/api/account/${field}`, 'PUT', { [field]: value }).then(applySession),

    updatePassword: (currentPassword, newPassword) =>
      api('/api/account/password', 'PUT', { currentPassword, newPassword }),
  };

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
