import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setInitializing(false);
      return;
    }
    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setInitializing(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(email, password) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function updateEmail(email) {
    const data = await apiFetch('/api/account/email', {
      method: 'PUT',
      body: JSON.stringify({ email }),
    });
    setToken(data.token);
    setUser(data.user);
  }

  async function updatePassword(currentPassword, newPassword) {
    await apiFetch('/api/account/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async function updateCurrency(currency) {
    const data = await apiFetch('/api/account/currency', {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    });
    setUser(data.user);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        register,
        logout,
        updateEmail,
        updatePassword,
        updateCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
