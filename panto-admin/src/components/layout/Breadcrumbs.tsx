import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

function prettify(segment: string) {
  return segment
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground">
        Home
      </Link>
      {segments.map((seg, idx) => {
        const href = '/' + segments.slice(0, idx + 1).join('/');
        const last = idx === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {last ? (
              <span className="text-foreground font-medium">
                {prettify(seg)}
              </span>
            ) : (
              <Link to={href} className="hover:text-foreground">
                {prettify(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
