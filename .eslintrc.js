module.exports = {
  "extends": ["airbnb-base", "plugin:jest/recommended"],
  "parser": "typescript-eslint-parser",
  rules: {
      strict: 0,
      semi: 2,
      "arrow-parens": [2, "always"],
      "import/no-unresolved": 0, // because typescript already check for it
      "import/extensions": 0,
      "import/prefer-default-export": 0,
      "import/no-extraneous-dependencies": ["error", { "devDependencies": ["**/*.test.ts", "**/testApi.ts", '**/*.seed.ts', 'misc/**/*.ts'] }],
      "typescript/no-unused-vars": 2,
      "arrow-body-style": 0,
      "no-console": 0,
      "no-await-in-loop": 0
  },
  "plugins": [
      "typescript",
      "jest"
  ],
  "env": {
      "jest/globals": true
  },
  overrides: {
      files: ['**/*.ts'],
      parser: 'typescript-eslint-parser',
      rules: {
          'no-undef': 'off',
          'no-restricted-globals': 'off'
      }
  }
};