import React, { createContext, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  teacherTheme: Theme;
  adminTheme: Theme;
  toggleTeacherTheme: () => void;
  toggleAdminTheme: () => void;
  setTeacherTheme: (theme: Theme) => void;
  setAdminTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Staff workspaces share the fixed, high-contrast light palette.
  const teacherTheme: Theme = 'light';
  const adminTheme: Theme = 'light';

  useEffect(() => {
    try {
      localStorage.setItem('kc_teacher_theme', 'light');
      localStorage.setItem('kc_admin_theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  const setTeacherTheme = () => {};
  const setAdminTheme = () => {};
  const toggleTeacherTheme = () => {};
  const toggleAdminTheme = () => {};

  return (
    <ThemeContext.Provider
      value={{
        teacherTheme,
        adminTheme,
        toggleTeacherTheme,
        toggleAdminTheme,
        setTeacherTheme,
        setAdminTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
