import { Activity } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { NAV_ITEMS } from './nav';

export function Sidebar() {
  return (
    <aside className="safe-top fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card/40 px-3 py-4 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-ink">TubePulse</p>
          <p className="text-[10px] uppercase tracking-wide text-muted">Creator analytics</p>
        </div>
      </div>

      <nav aria-label="Primary" className="mt-6 flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-line/40 hover:text-ink',
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <p className="px-3 text-[11px] leading-relaxed text-muted">
        All revenue figures are estimates unless marked Real.
      </p>
    </aside>
  );
}
