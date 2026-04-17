import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Wallet, ScanLine, Clock, User } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/pay', icon: ScanLine, label: 'Pay', isFab: true },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <Outlet />

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          padding: '8px 4px 12px',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
          zIndex: 100,
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  textDecoration: 'none',
                  marginTop: -24,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: '#0047bf',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(0, 71, 191, 0.35)',
                  }}
                >
                  <Icon size={26} color="#ffffff" />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0047bf',
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                padding: '4px 12px',
              }}
            >
              <Icon
                size={22}
                color={active ? '#0047bf' : '#9ca3af'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#0047bf' : '#9ca3af',
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
