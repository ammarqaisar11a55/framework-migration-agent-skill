import { createRoot } from "react-dom/client";
import ReactDOM from 'react-dom';
import App from './App.jsx';

// Renders the app into a container element.
export function mount(container) {
  const root = createRoot(container);
  root.render(<App initial={1} />);
}
