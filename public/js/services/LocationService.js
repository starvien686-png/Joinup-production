const LocationService = {
    // OpenStreetMap Nominatim API endpoint
    NOMINATIM_API: 'https://nominatim.openstreetmap.org/reverse',

    // Cache to prevent excessive API calls
    cache: {
        lat: null,
        lon: null,
        address: null,
        timestamp: 0
    },

    CACHE_DURATION: 60000, // 1 minute cache

    /**
     * Get the current user location address.
     * @returns {Promise<string>} The formatted address or error message.
     */
    async getCurrentPlace() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser.');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    try {
                        const address = await this.reverseGeocode(latitude, longitude);
                        resolve(address);
                    } catch (error) {
                        console.error('[LocationService] API Error:', error);
                        reject(error);
                    }
                },
                (error) => {
                    console.error('[LocationService] GPS Error:', error);
                    let msgKey = 'loc.err.default';
                    switch (error.code) {
                        case error.PERMISSION_DENIED: msgKey = 'loc.err.denied'; break;
                        case error.POSITION_UNAVAILABLE: msgKey = 'loc.err.unavailable'; break;
                        case error.TIMEOUT: msgKey = 'loc.err.timeout'; break;
                    }
                    reject(new Error(msgKey));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        });
    },

    /**
     * Reverse geocode coordinates to an address using OpenStreetMap.
     * @param {number} lat Latitude
     * @param {number} lon Longitude
     * @returns {Promise<string>}
     */
    async reverseGeocode(lat, lon) {
        // Check cache
        if (this.cache.address &&
            this.cache.lat === lat &&
            this.cache.lon === lon &&
            (Date.now() - this.cache.timestamp < this.CACHE_DURATION)) {
            console.log('[LocationService] Using cached location');
            return this.cache.address;
        }

        const lang = I18n.getLanguage() === 'zh-TW' ? 'zh-TW' : 'en';
        const url = `${this.NOMINATIM_API}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=${lang}`;

        const response = await fetch(url, {
            headers: {
                // Usage policy requires a User-Agent
                'User-Agent': 'JoinUp-CampusPlatform/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API Error: ${response.status}`);
        }

        const data = await response.json();

        // Construct a friendly name
        // Prioritize: amenity name > building > road > city
        const addr = data.address;
        let displayName = '';

        if (addr.university) displayName = addr.university;
        else if (addr.amenity) displayName = addr.amenity;
        else if (addr.building) displayName = addr.building;
        else if (addr.road) displayName = `${addr.road}, ${addr.suburb || addr.city_district || ''}`;
        else displayName = data.display_name.split(',')[0]; // Fallback to first part of full address

        // Update Cache
        this.cache = {
            lat,
            lon,
            address: displayName,
            timestamp: Date.now()
        };

        return displayName;
    }
};

window.LocationService = LocationService;
