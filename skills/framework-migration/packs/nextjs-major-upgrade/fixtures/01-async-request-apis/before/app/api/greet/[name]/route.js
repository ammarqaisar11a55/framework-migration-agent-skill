import { headers } from 'next/headers';

export function GET(request, { params }) {
  const language = headers().get('accept-language')?.split(',')[0] ?? 'en';
  return Response.json({ greeting: `Hello ${params.name}`, language });
}
