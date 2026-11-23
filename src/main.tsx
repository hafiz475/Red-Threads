import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && new URLSearchParams(location.search).has('synthetic-preview')) {
  import('./dev/SyntheticPreview').then(({ SyntheticPreview }) => root.render(<React.StrictMode><SyntheticPreview /></React.StrictMode>));
} else {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}

