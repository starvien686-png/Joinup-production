import fs from 'fs';
import path from 'path';

// read mockStore.js
const mockStoreCode = fs.readFileSync('c:/Users/Gisele/OneDrive/Desktop/Joinup/js/models/mockStore.js', 'utf8');
const allPostsMatch = mockStoreCode.match(/const initialPosts = (\[[\s\S]*?\]);/);

if (allPostsMatch) {
    console.log("Found posts data.");
} else {
    console.log("Could not parse initialPosts");
}
