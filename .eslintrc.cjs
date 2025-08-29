module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
};
