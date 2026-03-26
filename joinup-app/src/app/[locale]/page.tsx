import { useTranslations, useFormatter } from 'next-intl';
import styles from "./page.module.css";
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

export default function Home() {
  const tHome = useTranslations('home');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const now = new Date();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>{tHome('greeting.morning')}!</h1>
            <p>JoinUp! NCNU</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className={styles.main}>
        <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#FF5722', background: '#FFF3E0', padding: '4px 8px', borderRadius: '4px' }}>
              {tHome('section.new_activity')}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#1976D2', cursor: 'pointer' }}>
              {tHome('section.view_all')} &gt;
            </span>
          </div>
          <h3 style={{ margin: '0 0 8px 0' }}>{tHome('section.upcoming')}</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            {tHome('section.new_desc')}
          </p>
          <button style={{ marginTop: '16px', background: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {tHome('section.explore')}
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '10px', background: '#f5f5f5' }}>
          <p>📅 {format.dateTime(now, { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p>💰 {format.number(1200, { style: 'currency', currency: 'TWD' })}</p>
        </div>

        <div className={styles.ctas}>
          <button className={styles.primary}>
            {tHome('categories.sports')}
          </button>
          <button className={styles.secondary}>
            {tHome('categories.carpool')}
          </button>
          <button className={styles.secondary}>
            {tHome('categories.housing')}
          </button>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 JoinUp! - {tCommon('labels.loading')}</p>
      </footer>
    </div>
  );
}
