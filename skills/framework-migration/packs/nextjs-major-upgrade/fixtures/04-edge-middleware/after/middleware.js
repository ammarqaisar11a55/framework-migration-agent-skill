import { NextResponse } from 'next/server';

// Runs at the edge, before the cache: keep it on the edge runtime.
export function middleware(request) {
  const country = request.headers.get('x-country') ?? 'unknown';
  const response = NextResponse.next();
  response.headers.set('x-edge-country', country);
  return response;
}

export const config = {
  runtime: 'experimental-edge',
  matcher: '/api/:path*',
};
