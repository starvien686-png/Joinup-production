export class NotificationService {
    constructor() {
        this.container = null;
        this.queue = [];
        this.isProcessing = false;
        this.audioContext = null;

        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }

        // Initialize Audio Context on first user interaction to handle autoplay policies
        const initAudio = () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };

        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
    }

    playDefaultSound(type) {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Sound profile based on type
        const now = this.audioContext.currentTime;

        if (type === 'error') {
            // Low error buzz
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } else if (type === 'success') {
            // Happy ping
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, now);
            oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);
        } else {
            // Default "pop"
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, now);
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
        }
    }

    show(message, type = 'info', options = {}) {
        const { duration = 4000, sound = true } = options;

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;

        let iconChar = 'ℹ️';
        if (type === 'success') iconChar = '✅';
        if (type === 'error') iconChar = '❌';
        if (type === 'warning') iconChar = '⚠️';

        toast.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${iconChar}</span>
                <span class="notification-message">${message}</span>
            </div>
            <div class="notification-progress">
                <div class="notification-progress-bar" style="transition: transform ${duration}ms linear;"></div>
            </div>
        `;

        // Click to dismiss
        toast.addEventListener('click', () => {
            this.dismiss(toast);
        });

        this.container.appendChild(toast);

        // Play Sound
        if (sound) {
            this.playDefaultSound(type);
        }

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
            const progressBar = toast.querySelector('.notification-progress-bar');
            if (progressBar) {
                // Determine scale transformation logic for progress bar if needed
                // CSS approach: defaults to width 100%, we can animate scaleX from 1 to 0
                progressBar.style.transform = 'scaleX(0)';
            }
        });

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }
    }

    // --- Native Simulation (Requirement 13) ---
    showNativeBanner(payload) {
        const banner = document.createElement('div');
        banner.className = 'native-push-banner';
        banner.dataset.notifId = payload.notifId || payload.data?.id || ''; 

        banner.innerHTML = `
            <div class="push-icon-app">🚀</div>
            <div class="push-text">
                <div class="push-title">${payload.title}</div>
                <div class="push-body">${payload.body}</div>
            </div>
        `;


        banner.onclick = () => {
            if (window.handleDeepLink) {
                window.handleDeepLink(payload.data);
            }
            this.dismissNative(banner);
        };

        document.body.appendChild(banner);
        this.playDefaultSound('info');

        setTimeout(() => banner.classList.add('visible'), 100);
        setTimeout(() => this.dismissNative(banner), 5000);

        // Inject styles if not present
        if (!document.getElementById('native-push-styles')) {
            const style = document.createElement('style');
            style.id = 'native-push-styles';
            style.textContent = `
                .native-push-banner {
                    position: fixed;
                    top: -100px;
                    left: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    padding: 12px 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    transition: transform 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
                    cursor: pointer;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .native-push-banner.visible {
                    transform: translateY(120px);
                }
                .push-icon-app { font-size: 1.5rem; }
                .push-title { font-weight: bold; font-size: 0.9rem; color: #1a1a1a; margin-bottom: 2px; }
                .push-body { font-size: 0.85rem; color: #666; }
            `;
            document.head.appendChild(style);
        }
    }

    dismissNative(banner) {
        if (!banner) return;
        
        // --- 🚀 MARK AS READ INTEGRATION ---
        const notifId = banner.dataset.notifId;
        if (notifId && !banner.dataset.markedRead) {
            banner.dataset.markedRead = 'true'; // Prevent duplicate calls
            fetch(`/api/v1/notifications/${notifId}/mark-as-read`, { method: 'POST' })
                .then(res => res.json())
                .then(data => console.log(`[Notification] Marked ${notifId} as read:`, data))
                .catch(err => console.error(`[Notification] Mark as read failed:`, err));
        }

        banner.classList.remove('visible');
        setTimeout(() => {
            if (banner.parentElement) banner.parentElement.removeChild(banner);
        }, 500);
    }


    success(message, options) { return this.show(message, 'success', options); }
    error(message, options) { return this.show(message, 'error', options); }
    warning(message, options) { return this.show(message, 'warning', options); }
    info(message, options) { return this.show(message, 'info', options); }

    dismiss(toast) {
        if (!toast || toast.classList.contains('hide')) return;

        toast.classList.remove('show');
        toast.classList.add('hide');

        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        });
    }
}

// Create a singleton instance
export const notifications = new NotificationService();
