var webpack = require('webpack');

module.exports = {

    entry: './src/main.js',

    output: {
        filename: 'hawk.js',
        library: 'hawk',
        libraryTarget: 'umd'
    },

    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true,
            comments: false
        }),
    ],

    module : {

        loaders: [ {
            test: /\.js$/,
            use : [
                {
                    loader: 'babel-loader',
                    query: {
                        presets: [ 'es2015' ]
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

    devtool: 'source-map',

    watch: true,

    watchOptions: {
        aggragateTimeout: 50
    }

};
