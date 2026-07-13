import { useEffect, useState } from 'react';

// Minimal hash-based router (no dependency). Routes: #/ , #/dashboard , #/new , #/risk/<id>.
export type Route =
  | { name: 'register' }
  | { name: 'dashboard' }
  | { name: 'controls' }
  | { name: 'new' }
  | { name: 'risk'; id: string };

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  if (path === '/dashboard') return { name: 'dashboard' };
  if (path === '/controls') return { name: 'controls' };
  if (path === '/new') return { name: 'new' };
  const m = path.match(/^\/risk\/([^/]+)$/);
  if (m) return { name: 'risk', id: decodeURIComponent(m[1]) };
  return { name: 'register' };
}

export function navigate(to: string) { window.location.hash = to; }

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
