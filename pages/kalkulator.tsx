import React from 'react';
import Layout from '@/components/Layout';
import GPACalculator from '@/components/GPACalculator';
import styles from '@/styles/Calculator.module.css';

export default function CalculatorPage() {
  return (
    <Layout 
      title="GPA Kalkulator" 
      description="Beregn din GPA med ECTS-poeng. Støtter både universitets- og videregående karakterer."
    >
      <div className={styles.calculatorPage}>
        <div className="container">
          <div className={styles.intro}>
            <h1>GPA Kalkulator</h1>
            <p className={styles.subtitle}>
              Beregn din gjennomsnittlige karakter (GPA) med støtte for ECTS-poeng.
              Støtter både universitetskarakterer (A-F) og videregående karakterer (1-6).
            </p>
          </div>
          <GPACalculator />
        </div>
      </div>
    </Layout>
  );
}

