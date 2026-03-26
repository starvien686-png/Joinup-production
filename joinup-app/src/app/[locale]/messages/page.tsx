'use client';

import { useTranslations, useFormatter } from 'next-intl';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';

export default function MessagesPage() {
    const t = useTranslations('messages');
    const tCommon = useTranslations('common');
    const format = useFormatter();

    // Simulated data - Logic labels like "online" are handled by i18n mapping
    const chatRooms = [
        {
            id: '1',
            type: 'support',
            lastMsg: 'Hello!',
            time: new Date(),
            isActive: true, // Will show Online key
            status: 'unread'
        },
        {
            id: '2',
            type: 'group',
            title: 'Study Group',
            lastMsg: 'Meet at 2?',
            time: new Date(Date.now() - 3600000),
            isActive: false, // Will show Offline key
            isTyping: true,
            status: 'read'
        }
    ];

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f9fa' }}>
            <header style={{ padding: '16px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title={t('navigation.back')}>
                        ⬅️
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>💬 {t('navigation.inbox')}</h2>
                </div>
                <LanguageSwitcher />
            </header>

            <div style={{ padding: '12px' }}>
                <input
                    type="text"
                    placeholder={t('placeholders.search')}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '24px', border: '1px solid #ddd', outline: 'none' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {chatRooms.length > 0 ? chatRooms.map(room => (
                    <div key={room.id} style={{ display: 'flex', gap: '12px', padding: '16px', background: 'white', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                            {room.type === 'support' ? '🎧' : '🏠'}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <h4 style={{ margin: 0 }}>{room.title || t('navigation.inbox')}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.7rem', color: room.status === 'unread' ? '#1976D2' : '#999', fontWeight: room.status === 'unread' ? 'bold' : 'normal' }}>
                                        {room.status === 'unread' ? t('chat_info.unread') : t('chat_info.read')}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#999' }}>
                                        {format.relativeTime(room.time)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: room.isTyping ? '#2e7d32' : '#666', fontStyle: room.isTyping ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {room.isTyping ? t('chat_info.typing') : room.lastMsg}
                                </p>
                                <span
                                    title={room.isActive ? t('chat_info.active_now') : t('chat_info.offline')}
                                    style={{ width: '8px', height: '8px', background: room.isActive ? '#4caf50' : '#ccc', borderRadius: '50%' }}
                                ></span>
                            </div>
                        </div>

                        <button
                            onClick={() => confirm(t('navigation.delete'))}
                            style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', padding: '4px' }}
                            title={t('navigation.delete')}
                        >
                            ✕
                        </button>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
                        <p style={{ fontWeight: 'bold' }}>{t('empty_states.no_messages')}</p>
                        <p style={{ fontSize: '0.9rem' }}>{t('empty_states.start_new')}</p>
                    </div>
                )}
            </div>

            <div style={{ padding: '0.75rem', background: 'white', borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingLeft: '0.5rem' }}>
                    <button style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }} title={t('placeholders.share_photo')}>📷</button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder={t('placeholders.type')}
                        style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #ddd', borderRadius: '24px', outline: 'none' }}
                    />
                    <button
                        style={{ background: '#2e7d32', color: 'white', borderRadius: '50%', width: '44px', height: '44px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={t('actions.send')}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}
