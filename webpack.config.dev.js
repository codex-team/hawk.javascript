const merge = require('webpack-merge');
const baseConfig = require('./webpack.config');
const path = require('path');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    port: 9000,
    open: true,
    publicPath: '/assets/',
    contentBase: path.resolve(__dirname, 'test'),
    watchContentBase: true
  }
});
