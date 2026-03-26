import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'id', 'zh-TW'],

    // Used when no locale matches
    defaultLocale: 'zh-TW',

    // Detection from browser
    localeDetection: true
});

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(en|id|zh-TW)/:path*']
};
