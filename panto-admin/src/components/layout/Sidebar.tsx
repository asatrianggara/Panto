import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Coins,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/wallets', label: 'Wallets', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/merchants', label: 'Merchants', icon: Store, disabled: true },
  { to: '/promos', label: 'Promos', icon: Megaphone, disabled: true },
  { to: '/points', label: 'Points', icon: Coins, disabled: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, disabled: true },
  { to: '/settings', label: 'Settings', icon: Settings, disabled: true },
];

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: Props) {
  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-20 bg-background/60 backdrop-blur-sm"
        />
      )}
      <aside
        className={cn(
          'flex w-60 shrink-0 flex-col border-r bg-card',
          'md:static md:translate-x-0',
          'fixed inset-y-0 left-0 z-30 transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              P
            </div>
            <span className="font-semibold">Panto Admin</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded-md hover:bg-accent"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60 cursor-not-allowed"
                  title="Coming in later phase"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <span className="ml-auto text-[10px] uppercase tracking-wider">
                    soon
                  </span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          v0.1.0 · Phase 0–2
        </div>
      </aside>
    </>
  );
}
