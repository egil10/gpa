import React, { useState, FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/router';
import styles from './BottomSearchBar.module.css';

export default function BottomSearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Navigate to search page with query
      router.push(`/sok?code=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className={styles.searchBarContainer}>
      <div className={styles.backdrop}></div>
      <div className={styles.searchBar}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <div className={styles.inputContainer}>
              <div className={styles.inputContent}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Søk etter emnekode (f.eks. IN2010-1)..."
                  className={styles.input}
                  autoComplete="off"
                />
              </div>
              <div className={styles.actions}>
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className={styles.clearButton}
                    aria-label="Clear"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  type="submit"
                  className={styles.submitButton}
                  aria-label="Search"
                  disabled={!query.trim()}
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

