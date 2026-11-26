import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { HistoryProvider } from './context/HistoryContext';
import { SettingsProvider } from './context/SettingsContext';
import { InsightsPage } from './pages/InsightsPage';
import { OverviewPage } from './pages/OverviewPage';
import { RevenuePage } from './pages/RevenuePage';
import { SettingsPage } from './pages/SettingsPage';
import { VideosPage } from './pages/VideosPage';

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <HistoryProvider>
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/revenue" element={<RevenuePage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </HistoryProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
