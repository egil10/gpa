import React from 'react';
import Layout from '@/components/Layout';
import styles from '@/styles/About.module.css';

export default function AboutPage() {
  return (
    <Layout title="Om" description="Om Karakterstatistikk">
      <div className={styles.aboutPage}>
        <div className="container">
          <div className={styles.content}>
            <h1>Om Karakterstatistikk</h1>
            
            <section className={styles.section}>
              <h2>Hva er dette?</h2>
              <p>
                Karakterstatistikk er en plattform for å utforske karakterfordelinger 
                for emner ved norske universiteter. Plattformen gir deg innsikt i 
                hvordan karakterer er fordelt på tvers av ulike emner og institusjoner.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Data</h2>
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
              <p>
                Dataen er offentlig tilgjengelig og oppdateres regelmessig. 
                Cached data i dette repositoryet er en kopi av offentlig tilgjengelig data 
                fra NSD og er lisensiert under samme NLOD 2.0 lisens.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Støttede institusjoner</h2>
              <ul className={styles.list}>
                <li>Universitetet i Oslo (UiO)</li>
                <li>Norges teknisk-naturvitenskapelige universitet (NTNU)</li>
                <li>OsloMet – storbyuniversitetet</li>
                <li>Universitetet i Bergen (UiB)</li>
                <li>Handelshøyskolen BI</li>
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


