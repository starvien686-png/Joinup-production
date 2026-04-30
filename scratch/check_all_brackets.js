const fs = require('fs');

function checkBrackets(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stack = [];
    const brackets = {
        '(': ')',
        '{': '}',
        '[': ']'
    };
    const lines = content.split('\n');
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultilineComment = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];

            if (inMultilineComment) {
                if (char === '*' && nextChar === '/') {
                    inMultilineComment = false;
                    j++;
                }
                continue;
            }

            if (inComment) {
                break; // Skip rest of line
            }

            if (inString) {
                if (char === stringChar && line[j - 1] !== '\\') {
                    inString = false;
                }
                continue;
            }

            if (char === '/' && nextChar === '/') {
                inComment = true;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                inMultilineComment = true;
                j++;
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
                continue;
            }

            if (brackets[char]) {
                stack.push({ char, line: i + 1, col: j + 1 });
            } else if (Object.values(brackets).includes(char)) {
                const last = stack.pop();
                if (!last || brackets[last.char] !== char) {
                    console.log(`Mismatched bracket at line ${i + 1}, col ${j + 1}: found ${char}, expected ${last ? brackets[last.char] : 'none'}`);
                    return false;
                }
            }
        }
        inComment = false;
    }

    if (stack.length > 0) {
        const last = stack.pop();
        console.log(`Unclosed bracket: ${last.char} at line ${last.line}, col ${last.col}`);
        return false;
    }

    console.log(`Brackets are balanced in ${filePath}!`);
    return true;
}

const files = [
    'c:\\Users\\User\\OneDrive\\Desktop\\Joinup\\public\\js\\app.js',
    'c:\\Users\\User\\OneDrive\\Desktop\\Joinup\\public\\js\\views\\home.js',
    'c:\\Users\\User\\OneDrive\\Desktop\\Joinup\\public\\js\\views\\register.js',
    'c:\\Users\\User\\OneDrive\\Desktop\\Joinup\\public\\js\\services\\i18n.js'
];

files.forEach(f => {
    try {
        checkBrackets(f);
    } catch (e) {
        console.error(`Error checking ${f}:`, e.message);
    }
});
