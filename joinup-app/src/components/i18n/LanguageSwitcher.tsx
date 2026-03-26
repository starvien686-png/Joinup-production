'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'zh-TW', name: '繁體中文' }
];

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const handleSwitch = (newLocale: string) => {
        // In next-intl with App Router, the pathname often includes the locale segment at index 1.
        const segments = pathname.split('/');
        segments[1] = newLocale;
        router.push(segments.join('/'));
    };

    return (
        <div style={{ margin: '10px 0' }}>
            <label htmlFor="lang-select" style={{ marginRight: '10px', fontSize: '14px' }}>
                🌐 Language:
            </label>
            <select
                id="lang-select"
                value={locale}
                onChange={(e) => handleSwitch(e.target.value)}
                style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    outline: 'none'
                }}
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
