const { registerTransforms } = require('@tokens-studio/sd-transforms');
const StyleDictionary = require('style-dictionary');


// will register them on StyleDictionary object
// that is installed as a dependency of this package.
registerTransforms(StyleDictionary);

const baseStyles = ['colors', 'radii', 'shadows', 'dimension', 'typography'];
baseStyles.forEach(group => {
  StyleDictionary.extend({
    // include: [`tokens/default/**/*.json`],
    source: [`./tokens.json`],
    transform: {
      // Now we can use the transform 'myTransform' below
      myTransform: {
        type: 'name',
        transformer: (token) => token.path.join('_').toUpperCase()
      }
    },
  }).buildAllPlatforms();
});

const myStyleDictionary = StyleDictionary.extend({
    "source": ["**/tokens.json"],
    "platforms": {
        "css": {
            "transformGroup": "tokens-studio",
            "buildPath": "../dist/assets/scss/",
            "files": [
              {
                "filter": function(token) {
                
                return token.type = "base/colors"
                },
                "destination": "variables.css",
                "format": "css/variables"
              }
            ]
          },
    //   "scss": {
    //     "transformGroup": "tokens-studio",
    //     "prefix": "sd",
    //     "buildPath": "../dist/assets/scss/",
    //     "files": [{
    //       "filter": function(token) {
            
    //         return token["base/colors"]
    //       },
    //       "destination": "_variables.scss",
    //       "format": "scss/variables",
    //       "options": {
    //         "outputReferences": true
    //       }
    //     }]
    //   }
    }
  });

myStyleDictionary.buildAllPlatforms();