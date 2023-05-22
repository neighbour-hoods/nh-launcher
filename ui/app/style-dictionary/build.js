const { registerTransforms } = require('@tokens-studio/sd-transforms');
const StyleDictionary = require('style-dictionary');


// will register them on StyleDictionary object
// that is installed as a dependency of this package.
registerTransforms(StyleDictionary);

const groups = ['base'];//, 'semantic', 'themes'];
groups.forEach(group => {
  StyleDictionary.extend({
    // include: [`**/*.json`],
    include: [`**/${group}/*.json`],
    // transform: {
    //   // Now we can use the transform 'myTransform' below
    //   myTransform: {
    //     type: 'name',
    //     transformer: (token) => token.path.join('_').toUpperCase()
    //   }
    // },
    "platforms": {
      "css": {
          "transformGroup": "tokens-studio",
          "buildPath": "../dist/assets/css/",
          "files": [
            {
              "destination": `${group}.css`,
              "format": "css/variables"
            }
          ]
        },
        "scss": {
          "transformGroup": "scss",
          "prefix": "sd",
          "buildPath": "dist/assets/scss/",
          "files": [
            {
              "destination": `${group}.scss`,
              "format": "scss/variables",
              "options": {
                "outputReferences": true
              }
            }
          ]
        }
      },
  }).buildAllPlatforms();
});

// const myStyleDictionary = StyleDictionary.extend({
//     "source": ["**/tokens.json"],
//     //   "scss": {
//     //     "transformGroup": "tokens-studio",
//     //     "prefix": "sd",
//     //     "buildPath": "../dist/assets/scss/",
//     //     "files": [{
//     //       "filter": function(token) {
            
//     //         return token["base/colors"]
//     //       },
//     //       "destination": "_variables.scss",
//     //       "format": "scss/variables",
//     //       "options": {
//     //         "outputReferences": true
//     //       }
//     //     }]
//     //   }
//   });

// myStyleDictionary.buildAllPlatforms();