import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kc_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('kc_admin_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data && res.data.role === 'ADMIN') {
            setUser(res.data);
            localStorage.setItem('kc_admin_user', JSON.stringify(res.data));
          } else {
            throw new Error('Unauthorized');
          }
        } catch (e) {
          console.warn('Session expired, clearing token');
          localStorage.removeItem('kc_admin_token');
          localStorage.removeItem('kc_admin_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const loginAdmin = async (email: string, password: string) => {
    const res = await authApi.adminLogin({ email, password });
    if (res.success) {
      localStorage.setItem('kc_admin_token', res.token);
      localStorage.setItem('kc_admin_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('kc_admin_token');
    localStorage.removeItem('kc_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAdmin,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
