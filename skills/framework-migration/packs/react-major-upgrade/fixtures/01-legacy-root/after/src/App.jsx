import { useState } from 'react';

export default function App({ initial }) {
  const [count, setCount] = useState(initial);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
