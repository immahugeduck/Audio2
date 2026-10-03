import { useCallback, useEffect, useState } from 'react';
import { parseHash, hrefFor, ParsedRoute, RouteId } from '../utils/routes';

/** Tiny hash router: views are linkable (#/settings/gain) and back/forward just work. */
export function useHashRoute() {
  const [route, setRoute] = useState<ParsedRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: RouteId, sub?: string) => {
    const next = hrefFor(id, sub);
    if (window.location.hash !== next) window.location.hash = next;
  }, []);

  return { route, navigate };
}
