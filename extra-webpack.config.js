
const path = require('path')
const webpack = require('webpack')

module.exports = {
    node: {
        fs : 'empty',
        net: 'empty',
        tls: 'empty',
        Buffer: false,
        process: false
    },
    plugins: [
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      ]
}