import { cookies, headers } from 'next/headers';

export async function generateMetadata(props) {
  const params = await props.params;
  return { title: `Post ${params.slug}` };
}

export default async function Post(props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const theme = (await cookies()).get('theme')?.value ?? 'light';
  const client = (await headers()).get('x-client') ?? 'unknown';
  return (
    <main>
      <h1>Post {params.slug}</h1>
      <p>Referrer {searchParams.ref ?? 'none'}</p>
      <p>Theme {theme}</p>
      <p>Client {client}</p>
    </main>
  );
}
