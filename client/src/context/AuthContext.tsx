import { browserStorage } from '../utils/browserStorage';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AgeGroupCode } from '../types';
import { authApi } from '../services/api';
import { vocabMasteryService } from '../services/vocabMasteryService';

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

// Keep one context object across Vite HMR updates. Recreating a context while
// its provider is preserved can leave route consumers attached to the old one.
const authContextGlobal = globalThis as typeof globalThis & {
  __KC_ENGLISH_KIDS_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined>;
};
const AuthContext = authContextGlobal.__KC_ENGLISH_KIDS_AUTH_CONTEXT__ ??= createContext<AuthContextType | undefined>(undefined);
const syncChildVocabulary = (childId?: string) => {
  if (!childId) return;
  void vocabMasteryService.syncWithBackend(childId).catch((error) => {
    if (import.meta.env.DEV) console.warn('[Auth] Deferred vocabulary sync.', error);
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = browserStorage.getItem('kc_user');
    try {return saved ? JSON.parse(saved) : null;} catch {return null;}
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = browserStorage.getItem('kc_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            browserStorage.setItem('kc_user', JSON.stringify(res.data));
            if (res.data.role === 'CHILD') {
              syncChildVocabulary(res.data.id || res.data._id);
            }
          }
        } catch (e) {
          console.warn('Session expired, clearing token');
          browserStorage.removeItem('kc_token');
          browserStorage.removeItem('kc_user');
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
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
      if (res.user?.role === 'CHILD') {
        syncChildVocabulary(res.user.id || res.user._id);
      }
    }
  };

  const loginStudentHome = async (identifier: string, password: string) => {
    const res = await authApi.childLogin({ identifier, password });
    if (res.success) {
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
      if (res.user?.role === 'CHILD') {
        syncChildVocabulary(res.user.id || res.user._id);
      }
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
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    const res = await authApi.adminLogin({ email, password });
    if (res.success) {
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const loginTeacher = async (email: string, password: string) => {
    const res = await authApi.teacherLogin({ email, password });
    if (res.success) {
      browserStorage.setItem('kc_token', res.token);
      browserStorage.setItem('kc_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const setAgeGroup = (ageGroup: AgeGroupCode) => {
    if (!user) return;
    const updatedUser: User = { ...user, ageGroupCode: ageGroup };
    setUser(updatedUser);
    browserStorage.setItem('kc_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    browserStorage.removeItem('kc_token');
    browserStorage.removeItem('kc_user');
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
