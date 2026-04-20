import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold">404</h1>
        <p className="text-muted-foreground">This page does not exist.</p>
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
