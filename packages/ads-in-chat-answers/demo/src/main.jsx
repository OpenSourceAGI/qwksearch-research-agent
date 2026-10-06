import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'ads-in-chat-answers/styles.css';
import './demo.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
