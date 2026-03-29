// Centralized API utility for JoinUp 53-Point Blueprint
const api = {
    async fetch(url, options = {}) {
        const { 
            method = 'GET', 
            body, 
            headers = {}, 
            idempotency = true,
            maxRetries = 3,
            initialDelay = 1000
        } = options;

        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        // 1. Idempotency Key Contract
        if (idempotency && ['POST', 'PUT', 'PATCH'].includes(method)) {
            config.headers['Idempotency-Key'] = crypto.randomUUID();
        }

        if (body) config.body = JSON.stringify(body);

        let attempt = 0;
        const execute = async () => {
            try {
                const response = await fetch(url, config);

                // 2. Overload UX Rule (503 Exponential Backoff)
                if (response.status === 503 && attempt < maxRetries) {
                    attempt++;
                    const delay = initialDelay * Math.pow(2, attempt);
                    console.warn(`System Overload (503). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return execute();
                }

                const data = await response.json();
                
                if (!response.ok) {
                    throw { 
                        status: response.status, 
                        errorCode: data.errorCode || 'UNKNOWN_ERROR',
                        message: data.message || 'An unexpected error occurred'
                    };
                }

                return data;
            } catch (error) {
                if (error.status) throw error;
                // Network or Timeout issues
                if (attempt < maxRetries) {
                    attempt++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return execute();
                }
                throw { errorCode: 'NETWORK_ERROR', message: 'Failed to connect to server. Please check your connection.' };
            }
        };

        return execute();
    }
};

window.api = api;
export default api;
