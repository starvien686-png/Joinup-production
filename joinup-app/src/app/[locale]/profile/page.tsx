'use client';

import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

export default function ProfilePage() {
    const t = useTranslations('profile');
    const tCommon = useTranslations('common');

    // Simulated dynamic data - Zero hardcoded Mandarin in variables
    const userData = {
        displayName: '', // Fallback will be handled by i18n
        email: 'user@ncnu.edu.tw',
        bio: '', // Fallback will be handled by i18n
        successMatches: 42,
        postCount: 12,
        followers: 128,
        following: 256,
        memberSince: '2026-01-01',
        isVerified: true
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>👤 {t('titles.profile')}</h2>
                <LanguageSwitcher />
            </header>

            <div style={{ textAlign: 'center', background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <div
                    title={t('titles.profile')}
                    style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f0f2f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                >
                    <span role="img" aria-label={t('titles.profile')}>👤</span>
                </div>

                <h3 style={{ margin: '0 0 8px 0' }}>
                    {userData.displayName || t('placeholders.displayName')}
                </h3>

                <p style={{ color: '#666', margin: '0 0 8px 0' }}>
                    {userData.email}
                </p>

                {userData.isVerified && (
                    <div style={{ fontSize: '0.8rem', color: '#1976D2', marginBottom: '8px', fontWeight: 'bold' }}>
                        ✅ {t('status.verified')}
                    </div>
                )}

                <p style={{ fontSize: '0.9rem', color: '#555', fontStyle: userData.bio ? 'normal' : 'italic', marginBottom: '20px' }}>
                    {userData.bio || t('placeholders.no_bio')}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {t('stats.posts', { count: userData.postCount })}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {t('stats.followers', { count: userData.followers })}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {t('stats.following', { count: userData.following })}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#999' }}>
                    {t('status.member_since', { date: userData.memberSince })}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button style={menuButtonStyle} title={t('actions.edit_profile')}>
                    <span>⚙️ {t('actions.edit_profile')}</span>
                    <span>&gt;</span>
                </button>
                <button style={menuButtonStyle} title={t('titles.account_info')}>
                    <span>🛠️ {t('titles.account_info')}</span>
                    <span>&gt;</span>
                </button>
                <button style={menuButtonStyle} title={t('titles.security')}>
                    <span>🔒 {t('titles.security')}</span>
                    <span>&gt;</span>
                </button>

                <button
                    style={{ ...menuButtonStyle, background: '#ffebee', color: '#c62828', border: 'none', marginTop: '20px' }}
                    onClick={() => confirm(tCommon('buttons.confirm'))}
                >
                    <span>🚪 {t('actions.logout')}</span>
                </button>
            </div>
        </div>
    );
}

const menuButtonStyle = {
    width: '100%',
    padding: '16px',
    background: 'white',
    border: '1px solid #eee',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#333',
    transition: 'background 0.2s'
};
