import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

window.addEventListener("load", () => {
  const container = document.getElementById('react-root');
  ReactDOM.createRoot(container).render(<App />);
});