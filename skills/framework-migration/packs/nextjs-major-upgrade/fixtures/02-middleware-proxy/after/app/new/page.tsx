export default async function NewPage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const { login } = await searchParams;
  return <h1>{login ? 'Please sign in' : 'New page'}</h1>;
}
