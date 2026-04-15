const axios = require('axios');

async function testCreation() {
    console.log("--- Testing Activity Creation ---");
    try {
        const response = await axios.post('http://localhost:8000/create-activity', {
            host_email: 'test@ncnu.edu.tw',
            category: 'sports',
            title: 'Test Basketball ' + Date.now(),
            sport_type: 'Basketball',
            people_needed: 4,
            event_time: '2026-04-15 10:00:00',
            deadline: '2026-04-15 09:00:00',
            location: 'NCNU Gym',
            description: 'Emergency test post'
        });
        console.log("SUCCESS:", response.data);
    } catch (error) {
        console.error("FAILED:", error.response ? error.response.data : error.message);
    }
}

testCreation();
