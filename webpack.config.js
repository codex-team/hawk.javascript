module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: './hawk.js',
    library: 'HawkClient'
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: 'babel-loader'
      }
    ]
  }
};
