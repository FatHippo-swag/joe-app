import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  // Load custom font
  useEffect(() => {
    document.documentElement.classList.add('custom-font-loaded');
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;