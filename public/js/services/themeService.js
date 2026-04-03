/**
 * ThemeService handles Light/Dark mode state and persistence.
 */
export const ThemeService = {
    getTheme() {
        return localStorage.getItem('theme') || 'light';
    },

    setTheme(theme) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update body class for manual overrides if needed
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
    },

    toggleTheme() {
        const current = this.getTheme();
        const next = current === 'light' ? 'dark' : 'light';
        this.setTheme(next);
        return next;
    },

    init() {
        const theme = this.getTheme();
        this.setTheme(theme);
    }
};

// Initialize theme on load
ThemeService.init();
