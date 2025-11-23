import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  return (
    <div className={`${styles.card} hover-lift`}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
        {trend && (
          <span className={`${styles.trend} ${styles[trend]}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <div className={styles.value}>{value}</div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}


