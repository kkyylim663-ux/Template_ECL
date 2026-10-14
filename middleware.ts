import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_REGION, isRegionCode } from '@/config/brand';

/**
 * Region lives in the path, language lives in a cookie: `/my` and `/sg` are two
 * markets that share every route.
 */
const SESSION_COOKIE = 'brand_session';

/** Top-level segments that are intentionally NOT region-scoped (dev tooling). */
const STANDALONE_SEGMENTS = new Set(['dev']);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];

  // The bare root has no meaning of its own: pick a market and go.
  if (segments.length === 0) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_REGION}`;
    // 307: temporary, and it keeps the method if a form ever posts here.
    return NextResponse.redirect(url, 307);
  }

  if (first && STANDALONE_SEGMENTS.has(first)) {
    return NextResponse.next();
  }

  if (!first || !isRegionCode(first)) {
    return notFound(request);
  }

  // Member area is cookie-guarded here so an unauthenticated hit never reaches
  // the account shell, and the original destination survives in `next`.
  if (segments[1] === 'account' && !request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${first}/login`;
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    // 302, the conventional status for an auth redirect.
    return NextResponse.redirect(url, 302);
  }

  return NextResponse.next();
}

/**
 * Renders the app's own 404 page for a region that does not exist, instead of
 * passing the path through to a dynamic segment as if it were a market.
 */
function notFound(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/_invalid-region';
  url.search = '';
  return NextResponse.rewrite(url, { status: 404 });
}

export const config = {
  // Skip the API surface, Next internals and anything with a file extension
  // (robots.txt, sitemap.xml, icons) so static files are never region-checked.
  matcher: ['/((?!api|_next/static|_next/image|_next/data|.*\\..*).*)'],
};
