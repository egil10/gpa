import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomSearchBar from './BottomSearchBar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
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
        <Navbar />
        <main className="flex-1 relative z-10 pb-32">
          {children}
        </main>
        <Footer />
        <BottomSearchBar />
      </div>
    </>
  );
}


