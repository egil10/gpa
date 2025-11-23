import React from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className="container">
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            <span className="text-mono">KARAKTER</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/">Hjem</Link>
            <Link href="/sok">Søk</Link>
            <Link href="/kalkulator">Kalkulator</Link>
            <Link href="/om">Om</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}


