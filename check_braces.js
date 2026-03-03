const fs = require('fs');

const code = fs.readFileSync('app/dashboard/documents/[id]/page.tsx', 'utf8');
const lines = code.split('\n');

let depth = 0;
let componentCloseLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') depth++;
        if (line[j] === '}') {
            depth--;
            if (depth === 0 && i > 15) { // Assuming component starts around line 15
                componentCloseLine = i + 1;
                console.log(`Component closed at line ${componentCloseLine}`);
                process.exit(0);
            }
        }
    }
}
console.log('Depth balance at EOF:', depth);
