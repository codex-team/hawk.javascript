var webpack = require('webpack');

module.exports = {

    entry: './src/main.js',

    output: {
        filename: 'hawk.js',
        library: 'hawk',
        libraryTarget: 'umd'
    },

    plugins: [
        new webpack.optimize.UglifyJsPlugin(),
    ],

    module : {

        loaders: [ {
            test: /\.js$/,
            use : [
                {
                    loader: 'babel-loader',
                    query: {
                        presets: [ 'env' ]
                    }
                },
                {
                    loader: 'eslint-loader',
                    options: {
                        fix: true,
                        sourceType: 'module'
                    }
                }
            ]
        } ]

    },

    watch: true,

    watchOptions: {
        aggragateTimeout: 50
    }

};
