const fs = require('fs');
const path = require('path');

const tokenFile = "tokens.json"
const filestream = fs.readFileSync(tokenFile)
const tokenConfig = JSON.parse(filestream);

const themeTokenSets = tokenConfig.$themes.find((c) => c.name === 'Dark').selectedTokenSets

const theme = {}

Object.keys(themeTokenSets).forEach(
  (tokenset) => {
    for (let [key, value] of Object.entries(tokenConfig[tokenset])) {
      theme[key] = value;
    }
  }
);

const themeJson = JSON.stringify(theme, null, 2)
console.log(themeJson)
const systemTokens = 'theme.json';

fs.writeFileSync(systemTokens, themeJson);
