import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

// Generate stars for background
const generateStars = () => {
  const stars = [];
  for (let i = 0; i < 15; i++) {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    stars.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          width: '4px',
          height: '4px',
          background: 'white',
          borderRadius: '50%',
          top: `${top}%`,
          left: `${left}%`,
          opacity: 0.3,
          animation: `ping ${2 + Math.random() * 2}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    );
  }
  return stars;
};

export default function Layout({ children, title, description }: LayoutProps) {
  const siteTitle = title ? `${title} | Karakterstatistikk` : 'Karakterstatistikk';
  const siteDescription = description || 
    'Utforsk karakterstatistikk for norske universitetsemner. Data fra NSD.';

  // Noise texture SVG data URL
  const noiseTexture = `data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E`;

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/gpa/favicon.svg" type="image/svg+xml" />
      </Head>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom, #000000 0%, #050505 50%, #000000 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Subtle moving stars */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
          pointerEvents: 'none'
        }}>
          {generateStars()}
        </div>
        
        {/* Very faint noise texture */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            opacity: 0.05,
            pointerEvents: 'none',
            backgroundImage: `url("${noiseTexture}")`,
            backgroundSize: '256px 256px',
          }}
        />
        
        <Navbar />
        <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}


