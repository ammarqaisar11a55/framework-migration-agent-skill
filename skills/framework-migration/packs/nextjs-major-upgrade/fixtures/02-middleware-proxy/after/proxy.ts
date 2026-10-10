import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/old') {
    return NextResponse.redirect(new URL('/new', request.url));
  }
  if (request.nextUrl.pathname.startsWith('/account') && !request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/new?login=1', request.url));
  }
  const response = NextResponse.next();
  response.headers.set('x-proxied', '1');
  return response;
}

export const config = {
  matcher: ['/old', '/new', '/account/:path*'],
};
