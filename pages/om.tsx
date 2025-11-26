import React from 'react';
import Layout from '@/components/Layout';
import styles from '@/styles/About.module.css';

export default function AboutPage() {
  return (
    <Layout title="Om" description="Om Karakterfordeling">
      <div className={styles.aboutPage}>
        <div className="container">
          <div className={styles.content}>
            <h1>Om Karakterfordeling</h1>
            
            <section className={styles.section}>
              <h2>Hva er dette?</h2>
              <p>
                Karakterfordeling er en plattform for å utforske karakterfordelinger 
                for emner ved norske universiteter og videregående skoler. Plattformen gir deg innsikt i 
                hvordan karakterer er fordelt på tvers av ulike emner og institusjoner.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Data</h2>
              <h3>Universitetsdata</h3>
              <p>
                Universitetsdata er under{' '}
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
                {' '}fra{' '}
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
                .
              </p>
              <p>
                Dataen er offentlig tilgjengelig og oppdateres regelmessig. 
                Cached data i dette repositoryet er en kopi av offentlig tilgjengelig data 
                fra NSD og er lisensiert under samme NLOD 2.0 lisens.
              </p>
              
              <h3>VGS-data</h3>
              <p>
                VGS-data (videregående skole) er fra{' '}
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
            </section>

            <section className={styles.section}>
              <h2>Støttede institusjoner</h2>
              <p>
                Plattformen støtter karakterstatistikk for emner ved alle norske universiteter 
                og høgskoler, samt videregående skoler (VGS). Noen av de største institusjonene inkluderer:
              </p>
              <ul className={styles.list}>
                <li>Universitetet i Oslo (UiO)</li>
                <li>Norges teknisk-naturvitenskapelige universitet (NTNU)</li>
                <li>Universitetet i Bergen (UiB)</li>
                <li>Norges handelshøyskole (NHH)</li>
                <li>Videregående Skole (VGS)</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Teknologi</h2>
              <p>
                Plattformen er bygget med moderne webteknologi:
              </p>
              <ul className={styles.list}>
                <li>Next.js for frontend-rammeverk</li>
                <li>React for brukergrensesnitt</li>
                <li>TypeScript for typesikkerhet</li>
                <li>Recharts for datavisualisering</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Kontakt</h2>
              <p>
                Har du spørsmål eller tilbakemeldinger? Ta kontakt via{' '}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}


