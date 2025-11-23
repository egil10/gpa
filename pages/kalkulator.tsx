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
          <GPACalculator />
        </div>
      </div>
    </Layout>
  );
}

