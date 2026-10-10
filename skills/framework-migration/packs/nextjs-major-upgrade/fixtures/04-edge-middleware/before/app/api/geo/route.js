export async function GET(request) {
  return Response.json({ country: request.headers.get('x-country') ?? 'unknown' });
}
