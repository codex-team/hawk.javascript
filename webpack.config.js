const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: 'hawk.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  }
};
