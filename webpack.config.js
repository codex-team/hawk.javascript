module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: './hawk.js',
    libraryTarget: 'umd',
    library: 'hawk'
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: 'babel-loader'
      }
    ]
  },
  stats: {
    colors: true
  }
};
