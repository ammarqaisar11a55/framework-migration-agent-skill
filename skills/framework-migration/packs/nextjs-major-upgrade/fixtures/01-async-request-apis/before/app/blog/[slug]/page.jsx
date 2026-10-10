import { cookies, headers } from 'next/headers';

export function generateMetadata({ params }) {
  return { title: `Post ${params.slug}` };
}

export default function Post({ params, searchParams }) {
  const theme = cookies().get('theme')?.value ?? 'light';
  const client = headers().get('x-client') ?? 'unknown';
  return (
    <main>
      <h1>Post {params.slug}</h1>
      <p>Referrer {searchParams.ref ?? 'none'}</p>
      <p>Theme {theme}</p>
      <p>Client {client}</p>
    </main>
  );
}
