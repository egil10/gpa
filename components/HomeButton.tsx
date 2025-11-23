import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Home } from 'lucide-react';
import styles from './HomeButton.module.css';

export default function HomeButton() {
  const router = useRouter();
  const isHomePage = router.pathname === '/';

  if (isHomePage) return null;

  return (
    <Link href="/" className={styles.homeButton} aria-label="Go to home" title="Hjem">
      <Home size={20} />
    </Link>
  );
}

