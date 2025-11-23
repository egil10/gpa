import React from 'react';
import Link from 'next/link';
import { Github, Calculator } from 'lucide-react';
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
            <p className={styles.footerSubtext}>
              Støtter UiO, NTNU, UiB og NHH. Bygget med Next.js, React og TypeScript.
            </p>
          </div>
          <div className={styles.footerSection}>
            <h4>Data</h4>
            <p>
              Inneholder data under{' '}
              <a 
                href="https://data.norge.no/nlod/no/2.0/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Norsk lisens for offentlige data (NLOD)
              </a>
              {' '}tilgjengeliggjort av{' '}
              <a href="https://nsd.no" target="_blank" rel="noopener noreferrer">
                NSD (Norsk senter for forskningsdata)
              </a>
              .
            </p>
            <p className={styles.footerSubtext}>
              Dataen er offentlig tilgjengelig og oppdateres regelmessig.
            </p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p className="text-light">© {currentYear} Karakterstatistikk</p>
          <div className={styles.footerLinks}>
            <Link href="/kalkulator" className={styles.footerLink}>
              <Calculator size={18} />
              <span>GPA Kalkulator</span>
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


