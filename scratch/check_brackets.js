const fs = require('fs');
const content = fs.readFileSync('c:/Users/User/OneDrive/Desktop/Joinup/public/js/app.js', 'utf8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        if (char === '{') stack.push({ char, line: i + 1 });
        else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra } at line ${i + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}
if (stack.length > 0) {
    stack.forEach(s => console.log(`Unclosed ${s.char} from line ${s.line}`));
} else {
    console.log("Brackets are balanced!");
}
