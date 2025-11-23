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
  const siteTitle = title ? `${title} | Karakterstatistikk` : 'Karakterstatistikk';
  const siteDescription = description || 
    'Utforsk karakterstatistikk for norske universitetsemner. Data fra NSD.';

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <div className="min-h-screen bg-white flex flex-col">
        <HomeButton />
        <main className="flex-1 relative z-10 pb-32">
          {children}
        </main>
        <Footer />
        {!isSearchPage && !isHomePage && <BottomSearchBar />}
        <ScrollToTop />
      </div>
    </>
  );
}


