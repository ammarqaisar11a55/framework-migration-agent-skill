import ReactDOM from 'react-dom';
import App from './App.jsx';

// Renders the app into a container element.
export function mount(container) {
  ReactDOM.render(<App initial={1} />, container);
}
