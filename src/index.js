import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AppProvider } from './AppContext';


// Add data-theme attribute to HTML element for Samsung Browser
const applyHtmlDataTheme = () => {
  const storedSettings = localStorage.getItem('uncrypt-settings');
  if (storedSettings) {
    try {
      const { theme } = JSON.parse(storedSettings);
      document.documentElement.setAttribute('data-theme', theme || 'light');
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

// Apply data-theme right away
applyHtmlDataTheme();


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();