import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AgeGroupCode } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginChild: (avatar: string, pin: string, childId?: string) => Promise<void>;
  loginStudentHome: (identifier: string, password: string) => Promise<void>;
  registerChild: (payload: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password?: string;
    pin?: string;
    ageGroupCode: AgeGroupCode;
    avatar?: string;
  }) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginTeacher: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setAgeGroup: (ageGroup: AgeGroupCode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kc_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('kc_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('kc_user', JSON.stringify(res.data));
          }
        } catch (e) {
          console.warn('Session expired, clearing token');
          localStorage.removeItem('kc_token');
          localStorage.removeItem('kc_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const loginChild = async (avatar: string, pin: string, childId?: string) => {
    const res = await authApi.childLogin({ avatar, pin, childId });
    if (res.success) {
      localStorage.setItem('kc_token', res.token);
      localStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const loginStudentHome = async (identifier: string, password: string) => {
    const res = await authApi.childLogin({ identifier, password });
    if (res.success) {
      localStorage.setItem('kc_token', res.token);
      localStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const registerChild = async (payload: {
    name: string;
    identifier?: string;
    email?: string;
    phone?: string;
    password?: string;
    pin?: string;
    ageGroupCode: AgeGroupCode;
    avatar?: string;
  }) => {
    const res = await authApi.childRegister(payload);
    if (res.success) {
      localStorage.setItem('kc_token', res.token);
      localStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    const res = await authApi.adminLogin({ email, password });
    if (res.success) {
      localStorage.setItem('kc_token', res.token);
      localStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const loginTeacher = async (email: string, password: string) => {
    const res = await authApi.teacherLogin({ email, password });
    if (res.success) {
      localStorage.setItem('kc_token', res.token);
      localStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const setAgeGroup = (ageGroup: AgeGroupCode) => {
    if (!user) return;
    const updatedUser: User = { ...user, ageGroupCode: ageGroup };
    setUser(updatedUser);
    localStorage.setItem('kc_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginChild,
        loginStudentHome,
        registerChild,
        loginAdmin,
        loginTeacher,
        logout,
        setUser,
        setAgeGroup
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
