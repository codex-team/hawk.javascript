const webpack = require('webpack');
const merge = require('webpack-merge');
const path = require('path');

/**
 * Returns base config or its modification if mergeObject passed
 * @param {Object} mergeObject - object for modification base configuration (will be merged with base config)
 * @return {Object}
 */
function getBaseConfig(mergeObject = {}) {
  const pkg = require('./package.json');
  const VERSION = process.env.VERSION || pkg.version;

  const baseConfig = {
    mode: 'production',
    entry: './src/index.ts',
    output: {
      filename: './hawk.js',
      library: 'HawkCatcher',
      libraryExport: 'default'
    },
    resolve: {
      modules: [path.join(__dirname, 'src'), 'node_modules'],
      extensions: ['.js', '.ts']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true
              }
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: false,
                happyPackMode: false
              }
            }
          ]
        }
      ]
    },
    plugins: [
      /** Pass variables into modules */
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(VERSION)
      }),

      new webpack.BannerPlugin({
        banner: `Hawk JS Catcher.js\n\n@version ${VERSION}\n\n@licence Apache-2.0\n@author CodeX <https://codex.so>\n\n@see https://hawk.so\n@see https://github.com/codex-team/hawk.javascript`
      })
    ]
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
