const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
  files: ['dist/test/extension.test.js'],
});
