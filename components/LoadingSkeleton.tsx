import React from 'react';
import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'circle' | 'bar';
  width?: string;
  height?: string;
  className?: string;
}

export default function LoadingSkeleton({ 
  variant = 'text', 
  width, 
  height,
  className = ''
}: LoadingSkeletonProps) {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1rem',
  };

  return (
    <div 
      className={`${styles.skeleton} ${styles[variant]} ${className}`.trim()}
      style={style}
      aria-label="Laster..."
      role="status"
    >
      <span className={styles.srOnly}>Laster...</span>
    </div>
  );
}

// Predefined skeleton components for common use cases
export function CardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <LoadingSkeleton variant="text" height="1.5rem" width="60%" className={styles.cardTitle} />
      <LoadingSkeleton variant="text" height="0.875rem" width="40%" className={styles.cardSubtitle} />
      <LoadingSkeleton variant="bar" height="120px" className={styles.cardChart} />
      <div className={styles.cardStats}>
        <LoadingSkeleton variant="text" height="1rem" width="100%" />
        <LoadingSkeleton variant="text" height="1rem" width="100%" />
        <LoadingSkeleton variant="text" height="1rem" width="100%" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  );
}

