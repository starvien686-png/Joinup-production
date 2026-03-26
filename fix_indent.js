const fs = require('fs');
const path = 'c:\\Users\\User\\OneDrive\\Desktop\\Joinup\\js\\models\\mockStore.js';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

let inObject = false;
let objectLevel = 0;

const formattedLines = lines.map(line => {
    let trimmed = line.trim();
    if (trimmed.startsWith('export const MockStore = {')) {
        inObject = true;
        return line;
    }
    if (inObject && trimmed === '};') {
        inObject = false;
        return line;
    }

    if (inObject) {
        // Very basic indentation logic: 
        // If it starts with a method name or key, give it 4 spaces.
        // If it was already indented more, keep some relative indentation.
        // This is tricky. Let's just use a simpler rule:
        // If it's a property of MockStore, 4 spaces.
        // If it's inside a method, 8 spaces++.

        // Actually, let's just use a standard formatter if available? No.
        // Let's just fix the lines that have ZERO indentation but are clearly inside the object.
        if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('}') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
            return '    ' + line;
        }
    }
    return line;
});

fs.writeFileSync(path, formattedLines.join('\n'));
console.log('Done');
