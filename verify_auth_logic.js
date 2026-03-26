
import { MockStore } from './js/models/mockStore.js';

// Polyfill localStorage for Node.js environment
if (typeof localStorage === 'undefined' || localStorage === null) {
    const LocalStorage = require('node-localstorage').LocalStorage;
    global.localStorage = new LocalStorage('./scratch');
}

console.log('--- Testing MockStore Auth Logic ---');

// 1. Clean Slate
localStorage.clear();
console.log('1. Storage cleared.');

// 2. Test Registration (Valid)
console.log('\n2. Testing Valid Registration...');
const user1 = {
    email: 'test@mail1.ncnu.edu.tw',
    password: 'password123',
    realName: 'Test User',
    role: 'student'
};
const regResult = MockStore.registerUser(user1);
if (regResult.success && regResult.user.email === user1.email) {
    console.log('PASS: User registered successfully.');
} else {
    console.error('FAIL: Registration failed.', regResult);
}

// 3. Test Duplicate Registration
console.log('\n3. Testing Duplicate Registration...');
const regResult2 = MockStore.registerUser(user1);
if (!regResult2.success && regResult2.message === 'Email already registered') {
    console.log('PASS: Duplicate registration blocked.');
} else {
    console.error('FAIL: Duplicate registration should fail.', regResult2);
}

// 4. Test Login (Success)
console.log('\n4. Testing Valid Login...');
const loginResult = MockStore.loginUser(user1.email, user1.password);
if (loginResult.success && loginResult.user.email === user1.email) {
    console.log('PASS: Login successful.');
} else {
    console.error('FAIL: Login failed.', loginResult);
}

// 5. Test Login (Invalid Password)
console.log('\n5. Testing Invalid Password...');
const loginFail = MockStore.loginUser(user1.email, 'wrongpass');
if (!loginFail.success) {
    console.log('PASS: Invalid password blocked.');
} else {
    console.error('FAIL: Invalid password allowed.');
}

// 6. Test Login (Non-existent User)
console.log('\n6. Testing Non-existent User...');
const loginNoUser = MockStore.loginUser('nobody@mail1.ncnu.edu.tw', '123');
if (!loginNoUser.success) {
    console.log('PASS: Non-existent user blocked.');
} else {
    console.error('FAIL: Non-existent user allowed.');
}

console.log('\n--- Test Complete ---');
