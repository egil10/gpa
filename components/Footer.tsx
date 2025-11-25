import React from 'react';
import Link from 'next/link';
import { Github, Calculator, Home, BookOpen } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Om</h4>
            <p>
              Karakterstatistikk er en plattform for å utforske karakterfordelinger 
              for emner ved norske universiteter. Plattformen gir deg innsikt i 
              hvordan karakterer er fordelt på tvers av ulike emner og institusjoner.
            </p>
          </div>
          <div className={styles.footerSection}>
            <h4>Data</h4>
            <p>
              Universitetsdata er fra{' '}
              <a 
                href="https://dbh.hkdir.no/tall-og-statistikk/statistikk-meny/studenter" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Database for statistikk om høyere utdanning (DBH)
              </a>
              {' '}ved{' '}
              <a 
                href="https://hkdir.no" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Direktoratet for høyere utdanning og kompetanse (HK-dir)
              </a>
              , tilgjengeliggjort av{' '}
              <a href="https://nsd.no" target="_blank" rel="noopener noreferrer">
                NSD (Norsk senter for forskningsdata)
              </a>
              {' '}under{' '}
              <a 
                href="https://data.norge.no/nlod/no/2.0/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Norsk lisens for offentlige data (NLOD)
              </a>
              .
            </p>
            <p>
              VGS-data er fra{' '}
              <a 
                href="https://www.udir.no/tall-og-forskning/statistikk/statistikk-videregaaende-skole/karakterer-vgs/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Utdanningsdirektoratet (UDIR)
              </a>
              {' '}(
              <a 
                href="https://statistikkportalen.udir.no/api/rapportering/rest/v1/Tekst/visTekst/3?dataChanged=2025-11-25_163500" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Lisens
              </a>
              ).
            </p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p className="text-light">© {currentYear} Karakterstatistikk</p>
          <div className={styles.footerLinks}>
            <Link
              href={{ pathname: '/', query: { reset: '1' } }}
              className={styles.footerLink}
            >
              <Home size={18} />
              <span>Hjem</span>
            </Link>
            <Link href="/kalkulator" className={styles.footerLink}>
              <Calculator size={18} />
              <span>GPA Kalkulator</span>
            </Link>
            <Link href="/katalog" className={styles.footerLink}>
              <BookOpen size={18} />
              <span>Emnekatalog</span>
            </Link>
            <a 
              href="https://github.com/egil10/gpa" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.githubLink}
              aria-label="GitHub repository"
            >
              <Github size={18} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}


