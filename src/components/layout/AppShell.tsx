import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';

const ROOT_PATH = '/overview';

/** Android hardware back: go back in the router, exit at the root. */
function useAndroidBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    let disposed = false;

    void CapacitorApp.addListener('backButton', () => {
      if (pathname === ROOT_PATH || pathname === '/') {
        void CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeListener = () => void handle.remove();
      }
    });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [navigate, pathname]);
}

export function AppShell() {
  useAndroidBackButton();

  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex min-h-dvh flex-col lg:pl-60">
        <Header />
        <main className="safe-x mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 lg:pb-8">
          <Outlet />
        </main>
        <TabBar />
      </div>
    </div>
  );
}
