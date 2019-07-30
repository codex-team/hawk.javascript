const merge = require('webpack-merge');
const baseConfig = require('./webpack.config');
const path = require('path');

module.exports = merge(baseConfig, {
  mode: 'development',
  devServer: {
    port: 9000,
    watchContentBase: true,
    open: true,
    openPage: 'test'
  }
});
