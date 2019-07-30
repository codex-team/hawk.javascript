module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: './hawk.js',
    library: 'hawk'
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
