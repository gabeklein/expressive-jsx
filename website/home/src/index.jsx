import { createRoot } from 'react-dom/client';

import { App } from './App';

window.addEventListener("load", () => {
  const root = createRoot(
    document.getElementById('react-root')
  );
  
  root.render(<App />);
});