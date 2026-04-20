import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Breadcrumbs } from './Breadcrumbs';

interface Props {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: Props) {
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center">
            <User className="h-4 w-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium leading-none truncate max-w-[180px]">
              {admin?.email ?? 'Guest'}
            </div>
            <div className="text-xs text-muted-foreground leading-none mt-1">
              {admin?.role ?? '—'}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-md border bg-card shadow-lg">
            <div className="px-3 py-2 border-b sm:hidden">
              <div className="text-sm font-medium truncate">
                {admin?.email}
              </div>
              <div className="text-xs text-muted-foreground">{admin?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
