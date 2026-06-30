const DEFAULT_API_URL = 'https://agrikiri-backend-production.up.railway.app/api';

function getBackendNotifyUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  return `${apiUrl.replace(/\/+$/, '').replace(/\/api$/, '')}/api/moncash/notify`;
}

async function forwardRequest(request: Request) {
  const targetUrl = new URL(getBackendNotifyUrl());
  const incomingUrl = new URL(request.url);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  headers.set('x-forwarded-from', 'agrikiri-vercel-moncash-proxy');

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
    },
  });
}

export async function GET(request: Request) {
  return forwardRequest(request);
}

export async function POST(request: Request) {
  return forwardRequest(request);
}
