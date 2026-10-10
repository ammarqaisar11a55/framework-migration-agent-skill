import { headers } from 'next/headers';

export async function GET(request, props) {
  const params = await props.params;
  const language = (await headers()).get('accept-language')?.split(',')[0] ?? 'en';
  return Response.json({ greeting: `Hello ${params.name}`, language });
}
