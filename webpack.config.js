var webpack = require('webpack');

module.exports = {

  entry: './src/main.js',

  output: {
    filename: 'hawk.js',
    library: 'hawk'
  },

  plugins: [

    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
  ],

  module : {

    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel-loader',
      query: {
        presets: [__dirname + '/node_modules/babel-preset-es2015']
      }
    }]

  },

  devtool: "source-map",

  watch: true,

  watchOptions: {
    aggragateTimeout: 50
  }

};