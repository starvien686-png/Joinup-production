import { I18n } from '../services/i18n.js';
import { formatTime } from '../utils/dateFormatter.js';

export class LanguageSelector {
    constructor(containerId = null, options = {}) {
        this.containerId = containerId;
        this.options = {
            style: 'default', // 'default' (pill) or 'simple' (just icon/text)
            ...options
        };
        this.render();
    }

    render() {
        // If containerId is provided, render into it. 
        // Otherwise, just return the element (if needed for flexible placement)

        const container = this.containerId ? document.getElementById(this.containerId) : null;
        if (this.containerId && !container) {
            console.warn(`[LanguageSelector] Container #${this.containerId} not found.`);
            return;
        }

        const currentLang = I18n.getLanguage();

        const select = document.createElement('select');
        select.className = 'lang-selector-dropdown';
        select.innerHTML = `
            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇺🇸 English</option>
            <option value="zh-TW" ${currentLang === 'zh-TW' ? 'selected' : ''}>🇹🇼 繁體中文</option>
        `;

        // Apply styles dynamically if not in CSS
        Object.assign(select.style, {
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid #ddd',
            background: 'white',
            fontSize: '0.85rem',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            outline: 'none'
        });

        select.onchange = (e) => {
            const newLang = e.target.value;
            I18n.setLanguage(newLang);
            // Optional: force update specific elements if passed
            if (this.options.onUpdate) this.options.onUpdate(newLang);
        };

        if (container) {
            container.innerHTML = '';
            container.appendChild(select);
        } else {
            return select;
        }
    }
}
