var webpack = require('webpack');

module.exports = {

  entry: './src/main.js',

  output: {
    filename: './hawk.js',
    library: 'hawk'
  },

  devtool: "source-map",

  watch: true,

  watchOptions: {
    aggragateTimeout: 50
  }

};