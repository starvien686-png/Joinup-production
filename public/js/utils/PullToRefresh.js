/**
 * Premium Pull-to-Refresh Utility for JoinUp! 🚀
 * Handles gesture detection, resistance calculation, and UI updates.
 */
export class PullToRefresh {
    constructor(options) {
        this.container = options.container;
        this.onRefresh = options.onRefresh;
        this.threshold = options.threshold || 70;
        this.resistance = options.resistance || 2.5;
        
        this.startY = 0;
        this.currentY = 0;
        this.pullDelta = 0;
        this.isPulling = false;
        this.isRefreshing = false;
        
        this.init();
    }

    init() {
        // Create Indicator Element
        this.ptrElement = document.createElement('div');
        this.ptrElement.className = 'ptr-element';
        this.ptrElement.innerHTML = `<div class="ptr-icon">🔄</div>`;
        
        // Ensure container is relative/absolute
        const style = window.getComputedStyle(this.container);
        if (style.position === 'static') {
            this.container.style.position = 'relative';
        }
        
        this.container.prepend(this.ptrElement);

        // Bind Events
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleTouchStart(e) {
        if (this.isRefreshing) return;
        
        // Only trigger if at the very top
        if (this.container.scrollTop === 0 || window.scrollY === 0) {
            this.startY = e.touches[0].pageY;
            this.isPulling = true;
        }
    }

    handleTouchMove(e) {
        if (!this.isPulling || this.isRefreshing) return;

        this.currentY = e.touches[0].pageY;
        const rawDelta = this.currentY - this.startY;

        if (rawDelta > 0) {
            // Apply Resistance
            this.pullDelta = Math.pow(rawDelta, 0.85) * this.resistance;
            
            // Limit pull delta for safety
            if (this.pullDelta > this.threshold * 1.5) {
                this.pullDelta = this.threshold * 1.5 + (this.pullDelta - this.threshold * 1.5) * 0.2;
            }

            // Prevent default scroll if pulling down
            if (e.cancelable) e.preventDefault();

            this.updateUI();
        } else {
            this.isPulling = false;
            this.resetUI();
        }
    }

    handleTouchEnd() {
        if (!this.isPulling || this.isRefreshing) return;

        if (this.pullDelta >= this.threshold) {
            this.triggerRefresh();
        } else {
            this.isPulling = false;
            this.resetUI();
        }
    }

    updateUI() {
        this.ptrElement.classList.add('pulling');
        this.ptrElement.style.transform = `translateY(${this.pullDelta}px)`;
        
        // Rotate icon based on pull depth
        const icon = this.ptrElement.querySelector('.ptr-icon');
        const rotation = (this.pullDelta / this.threshold) * 360;
        icon.style.transform = `scale(1) rotate(${rotation}deg)`;
    }

    async triggerRefresh() {
        this.isRefreshing = true;
        this.ptrElement.classList.remove('pulling');
        this.ptrElement.classList.add('refreshing');
        
        // Lock at threshold height while refreshing
        this.ptrElement.style.transform = `translateY(${this.threshold}px)`;
        
        try {
            await this.onRefresh();
        } finally {
            this.complete();
        }
    }

    complete() {
        this.isRefreshing = false;
        this.isPulling = false;
        this.ptrElement.classList.remove('refreshing');
        this.resetUI();
    }

    resetUI() {
        this.pullDelta = 0;
        this.ptrElement.style.transform = `translateY(0)`;
        const icon = this.ptrElement.querySelector('.ptr-icon');
        icon.style.transform = `scale(0)`;
        
        setTimeout(() => {
            if (!this.isPulling && !this.isRefreshing) {
                this.ptrElement.classList.remove('pulling');
            }
        }, 200);
    }
}
