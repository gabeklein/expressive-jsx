import ReactDOM from 'react-dom/client';

import { App } from './app';

window.addEventListener("load", () => {
  const root = document.getElementById('react-root');

  ReactDOM.createRoot(root).render(<App />);
});