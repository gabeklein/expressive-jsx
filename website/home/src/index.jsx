import { createRoot } from 'react-dom/client';

import { App } from './App';

window.addEventListener("load", () => {
  const root = document.getElementById('react-root');

  createRoot(root).render(<App />);
});