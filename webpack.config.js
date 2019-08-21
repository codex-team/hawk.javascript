module.exports = [
  {
    mode: 'production',
    entry: './src/main.js',
    output: {
      filename: './hawk.js',
      library: 'HawkCatcher'
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: 'babel-loader'
        }
      ]
    }
  },
  {
    mode: 'production',
    entry: './src/main.js',
    output: {
      filename: './hawk.umd.js',
      library: 'HawkCatcher',
      libraryTarget: 'umd'
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: 'babel-loader'
        }
      ]
    }
  }
];
