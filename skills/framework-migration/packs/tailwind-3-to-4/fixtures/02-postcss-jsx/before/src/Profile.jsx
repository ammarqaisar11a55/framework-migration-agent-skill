export function Profile({ name }) {
  return (
    <article id="profile" className="rounded-lg shadow p-18 font-display">
      <h2 id="name" className="text-2xl text-gray-900 text-opacity-75">{name}</h2>
      <img id="avatar" className="rounded-full blur-sm flex-shrink-0" alt="" />
    </article>
  );
}
