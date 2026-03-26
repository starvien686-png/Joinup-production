const AIRTABLE_BASE_ID = 'appxl4LW8MhvgBjJD';
const AIRTABLE_TOKEN = 'pattA7ELpIcJO9V6s.a7efaa6b486efe4d6ec6cd23eff7bc981235848cfa95f50c59f99b77ccfde9cc';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

async function test() {
    try {
        console.log('Fetching User_Data...');
        const res = await fetch(`${AIRTABLE_API_URL}/User_Data`, {
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log(JSON.stringify(data, null, 2));

        if (res.ok) {
            console.log('Attempting to create a record...');
            const fields = {
                'Email': 's+9digitstudentnumber@mail1.ncnu.edu.tw',
                'Trust Points': 5
            };
            const postRes = await fetch(`${AIRTABLE_API_URL}/User_Data`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });
            const postData = await postRes.json();
            console.log('Post Status:', postRes.status);
            console.log(JSON.stringify(postData, null, 2));
        }

    } catch (e) {
        console.error('Error:', e);
    }
}
test();
