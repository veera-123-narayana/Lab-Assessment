import React, { useState, useEffect } from 'react';
import { StudentPortal } from './components/StudentPortal';
import { AdminPortal } from './components/AdminPortal';
import { getTheme, setTheme } from './lib/storage';

export default function App() {
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  // Detect route based on URL query or hash
  const checkRoute = () => {
    const params = new URLSearchParams(window.location.search);
    const hasAdminParam = params.get('admin') === 'true' || params.get('admin') === '1' || params.has('faculty');
    const hasAdminHash = window.location.hash.toLowerCase().includes('admin') || window.location.hash.toLowerCase().includes('faculty');
    const hasAdminPath = window.location.pathname.toLowerCase().includes('/admin');

    if (hasAdminParam || hasAdminHash || hasAdminPath) {
      setIsAdminView(true);
    } else {
      setIsAdminView(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkRoute();

    // Listen for hash / popstate changes
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    // Initial theme setup
    const initialTheme = getTheme();
    setThemeState(initialTheme);
    setTheme(initialTheme);

    // Discreet faculty hotkey shortcut: Ctrl + Shift + A
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        openAdmin();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('keydown', handleGlobalKey);
    };
  }, []);

  const openAdmin = () => {
    setIsAdminView(true);
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    window.history.pushState({}, '', url.toString());
  };

  const closeAdmin = () => {
    setIsAdminView(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    url.searchParams.delete('faculty');
    url.hash = '';
    window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  return (
    <div className={theme}>
      {isAdminView ? (
        <AdminPortal
          theme={theme}
          onToggleTheme={toggleTheme}
          onExitToStudentPortal={closeAdmin}
        />
      ) : (
        <StudentPortal
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAdminSecret={openAdmin}
        />
      )}
    </div>
  );
}
