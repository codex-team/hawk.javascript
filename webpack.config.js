const merge = require('webpack-merge');

/**
 * Returns base config or its modification if mergeObject passed
 * @param {Object} mergeObject - object for modification base configuration (will be merged with base config)
 * @return {Object}
 */
function getBaseConfig(mergeObject = {}) {
  const baseConfig = {
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
  };

  return merge(baseConfig, mergeObject);
}

module.exports = [
  getBaseConfig(),
  getBaseConfig({
    output: {
      filename: 'hawk.umd.js',
      libraryTarget: 'umd'
    }
  })
];
