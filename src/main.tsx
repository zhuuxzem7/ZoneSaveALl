import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const favicon =
  (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null) ||
  document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/jpeg';
favicon.href = '/assets/aistudio/sara_seo_pfp_6f6b2a74.jfif';
if (!favicon.parentElement) {
  document.head.appendChild(favicon);
}

createRoot(document.getElementById('root')!).render(<App />);
