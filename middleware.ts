import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporary site lock: respond with 404 for all application routes on Vercel.
export function middleware(_request: NextRequest) {
  return new NextResponse('404 - Site temporairement indisponible', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
