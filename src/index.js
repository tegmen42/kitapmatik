/**
 * Entry Point
 * React uygulamasının giriş noktası
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './styles/surprise.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

