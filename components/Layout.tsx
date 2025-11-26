import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Footer from './Footer';
import BottomSearchBar from './BottomSearchBar';
import ScrollToTop from './ScrollToTop';
import HomeButton from './HomeButton';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  const router = useRouter();
  const isSearchPage = router.pathname === '/sok';
  const isHomePage = router.pathname === '/';
  const siteTitle = title ? `${title} | Karakterfordeling` : 'Karakterfordeling';
  const siteDescription = description || 
    'Utforsk karakterfordelinger for norske universitetsemner. Data fra NSD.';

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <div className="min-h-screen bg-white flex flex-col">
        <HomeButton />
        <main className="flex-1 relative z-10 pb-32" style={{ 
          paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}>
          {children}
        </main>
        <Footer />
        {!isSearchPage && !isHomePage && <BottomSearchBar />}
        <ScrollToTop />
      </div>
    </>
  );
}


