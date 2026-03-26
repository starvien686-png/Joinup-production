const AIRTABLE_BASE_ID = 'appxl4LW8MhvgBjJD';
const AIRTABLE_TOKEN = 'pattA7ELpIcJO9V6s.a7efaa6b486efe4d6ec6cd23eff7bc981235848cfa95f50c59f99b77ccfde9cc';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

export const AirtableService = {
    async fetchTable(tableName, filter = '') {
        try {
            const url = `${AIRTABLE_API_URL}/${tableName}${filter ? `?filterByFormula=${encodeURIComponent(filter)}` : ''}`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[Airtable Error] fetchTable "${tableName}" failed. Status: ${response.status}`, errorData);
                throw new Error(`Airtable API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.records;
        } catch (error) {
            console.error(`[AirtableService] fetchTable "${tableName}" Exception:`, error);
            return [];
        }
    },

    async createRecord(tableName, fields) {
        try {
            const response = await fetch(`${AIRTABLE_API_URL}/${tableName}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[Airtable Error] createRecord in "${tableName}" failed. Status: ${response.status}`, errorData);
                throw new Error(`Airtable API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[AirtableService] createRecord in "${tableName}" Exception:`, error);
            return null;
        }
    },

    async updateRecord(tableName, recordId, fields) {
        try {
            const response = await fetch(`${AIRTABLE_API_URL}/${tableName}/${recordId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[Airtable Error] updateRecord in "${tableName}" (ID: ${recordId}) failed. Status: ${response.status}`, errorData);
                throw new Error(`Airtable API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[AirtableService] updateRecord in "${tableName}" Exception:`, error);
            return null;
        }
    },

    // --- Specific Logic ---

    async findUserRecord(email) {
        // Explicitly searching 'Email' column
        const records = await this.fetchTable('User_Data', `{Email} = '${email}'`);
        if (records.length === 0) {
            console.warn(`[AirtableService] No record found in "User_Data" for email: ${email}`);
        }
        return records[0] || null;
    },

    async syncUser(userData) {
        try {
            const existing = await this.findUserRecord(userData.email);

            if (existing) {
                // If user already exists, ONLY update the Last Login time
                console.log(`[AirtableService] Updating Last Login for existing user: ${userData.email}`);
                return await this.updateRecord('User_Data', existing.id, {
                    'Last Login': new Date().toISOString()
                });
            } else {
                // If user is new (first time sign up or not in Airtable yet), seed all data
                console.log(`[AirtableService] Creating full new user record: ${userData.email}`);
                const fields = {
                    'Email': userData.email,
                    'Password': userData.password || '', // As requested: mapping plain text password
                    'Full Name': userData.realName || userData.name,
                    'Nickname': userData.displayName || userData.name,
                    'Role': userData.role,
                    'Department': userData.department || userData.major,
                    'Major': userData.major || '',
                    'Account Status': userData.status || 'Active',
                    'Join Date': userData.createdAt || new Date().toISOString(),
                    'Is Blacklisted': userData.isBlacklisted ? true : false,
                    'Report Log': userData.reportsMade || 0,
                    'Reports Log': userData.reportsReceived || 0,
                    'Blacklist or Not': userData.isBlacklisted ? 'Yes' : 'No',
                    'Trust Points': userData.creditScore !== undefined ? userData.creditScore : 5,
                    'Last Login': new Date().toISOString()
                };
                return await this.createRecord('User_Data', fields);
            }
        } catch (error) {
            console.error(`[AirtableService] syncUser failed for ${userData.email}:`, error);
            return null;
        }
    },

    async updateUserPoints(email, points) {
        return await this.updateUser(email, { 'Trust Points': points });
    },

    async updateUser(email, fields) {
        console.log(`[AirtableService] Attempting to update user data for ${email}`, fields);
        const record = await this.findUserRecord(email);
        if (record) {
            return await this.updateRecord('User_Data', record.id, fields);
        }
        return null;
    },

    async checkAccountStatus(email) {
        const record = await this.findUserRecord(email);
        if (record) {
            return {
                status: record.fields['Account Status'] || 'Active',
                points: record.fields['Trust Points'] || 5,
                photoURL: record.fields['Avatar'] || ''
            };
        }
        return { status: 'Not Found', points: 5, photoURL: '' };
    },

    async recordReport(reportData) {
        return await this.createRecord('Reports_Log', {
            'Report ID': reportData.id,
            'Reporter ID': reportData.reporterId,
            'Target ID': reportData.targetId,
            'Type': reportData.type,
            'Description': reportData.description,
            'Evidence': JSON.stringify(reportData.evidence || []),
            'Created At': new Date().toISOString()
        });
    },

    async addBlacklistEntry(userId, reason, adminId) {
        return await this.createRecord('Blacklist_System', {
            'User ID': userId,
            'Reason': reason,
            'Admin ID': adminId,
            'Date': new Date().toISOString().split('T')[0]
        });
    },

    async updateRideStatus(email, status) {
        console.log(`[AirtableService] Updating Ride Status for ${email}`);
        const record = await this.findUserRecord(email);
        if (record) {
            return await this.updateRecord('User_Data', record.id, {
                'Ride Status': status
            });
        } else {
            console.warn('[AirtableService] Record ID not found. User must Sign In first.');
            alert("Please complete your 'Sign In' registration first.");
            return null;
        }
    },

    async linkEventParticipation(email, eventName) {
        console.log(`[AirtableService] Linking Event Participation for ${email} in ${eventName}`);
        const record = await this.findUserRecord(email);
        if (record) {
            const currentEvents = record.fields['Event Participation'] || '';
            const newEvents = currentEvents ? `${currentEvents}, ${eventName}` : eventName;

            return await this.updateRecord('User_Data', record.id, {
                'Event Participation': newEvents
            });
        } else {
            console.warn('[AirtableService] Record ID not found. User must Sign In first.');
            alert("Please complete your 'Sign In' registration first.");
            return null;
        }
    },

    async verifyAdmin(email, password = null) {
        console.log(`[AirtableService] Verifying admin status for email: ${email}`);
        // Explicitly searching 'Email' column in 'Admin_Data' table
        const filter = password
            ? `AND({Email} = '${email}', {Password} = '${password}')`
            : `{Email} = '${email}'`;

        const records = await this.fetchTable('Admin_Data', filter);

        if (records.length > 0) {
            console.log(`[AirtableService] Admin verification SUCCESS for ${email}`);
            return {
                success: true,
                name: records[0].fields['Name'] || 'Admin'
            };
        }

        console.warn(`[AirtableService] Admin verification FAILED for ${email}. Record not found or password incorrect.`);
        return { success: false };
    }
};
