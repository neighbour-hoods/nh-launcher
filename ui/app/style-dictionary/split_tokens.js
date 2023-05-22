const fs = require('fs');
const path = require('path');

function splitJSONFile(filePath) {
    // Read the JSON file
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    // Create the 'tokens' directory if it doesn't exist
    const tokensDir = path.join(__dirname, 'tokens');
    if (!fs.existsSync(tokensDir)) {
        fs.mkdirSync(tokensDir);
    }

    // Iterate over the parent properties
    for (const parent in data) {
        if (data.hasOwnProperty(parent)) {
            const childData = data[parent];
            const childFileName = `${parent}.json`;
            const childPath = path.join(tokensDir, childFileName);

            // Create the parent directory if it doesn't exist
            const parentDir = path.dirname(childPath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            // Convert the child data to JSON string
            const childJsonData = JSON.stringify(childData, null, 2);

            // Write the child JSON file
            fs.writeFileSync(childPath, childJsonData);

            console.log(`Created ${childFileName}`);
        }
    }
}

// Usage
const filePath = 'tokens.json';
splitJSONFile(filePath);