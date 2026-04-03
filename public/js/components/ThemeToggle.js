import { ThemeService } from '../services/themeService.js';

export class ThemeToggle {
    constructor(containerId = null) {
        this.containerId = containerId;
        this.render();
    }

    render() {
        const container = this.containerId ? document.getElementById(this.containerId) : null;
        if (this.containerId && !container) {
            console.warn(`[ThemeToggle] Container #${this.containerId} not found.`);
            return;
        }

        const currentTheme = ThemeService.getTheme();
        const button = document.createElement('button');
        button.className = 'theme-toggle-btn';
        button.innerHTML = currentTheme === 'light' ? '🌙' : '☀️';
        button.title = currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';

        Object.assign(button.style, {
            background: 'white',
            border: '1px solid #ddd',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s, background-color 0.2s'
        });

        button.onclick = () => {
            const next = ThemeService.toggleTheme();
            button.innerHTML = next === 'light' ? '🌙' : '☀️';
            button.title = next === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
        };

        if (container) {
            container.innerHTML = '';
            container.appendChild(button);
        } else {
            return button;
        }
    }
}
