/**
 * @file Application Entry Point (index.tsx)
 * @description This is the main starting point of the React application. Its primary
 * responsibility is to locate the root HTML element (with `id="root"`) in `index.html`
 * and then render the main `App` component into that element. This kicks off the
 * entire application.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Find the root DOM element in index.html where the app will be mounted.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find the root element to mount the application.");
}

// Create a React root and render the main App component.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
