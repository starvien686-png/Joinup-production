/**
 * JoinUp Configuration
 * Centralizing API URLs to support external access via tunnels (Cloudflare/Ngrok).
 */
const CONFIG = {
    // Automatically dynamic: uses the current browser address as the API base
    // This works for localhost:3000, 127.0.0.1:3000, OR your public tunnel URL
    API_BASE_URL: window.location.origin,

    // Fallback if needed (e.g., if frontend and backend were on different ports)
    // API_BASE_URL: "https://your-tunnel-url.trycloudflare.com"
};

// Export for module use if needed, but also attach to window for easy access in legacy scripts
window.CONFIG = CONFIG;
export default CONFIG;
