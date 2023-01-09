const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');
const Path = require('path');

const testFiles = [
    'engines/query-sparql/test/QuerySparql-test.ts',
];

// Based on https://github.com/tom-sherman/blog/blob/main/posts/02-running-jest-tests-in-a-browser.md
module.exports = function (config) {
    config.set({
        basePath: '',
        plugins: [
            'karma-webpack',
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-sourcemap-loader',
            'karma-jasmine-html-reporter',
        ],
        frameworks: ['jasmine', 'webpack'],

        files: ['./karma-setup.js', ...testFiles],
        client: {
            args: ['--grep', '/^(?!.*no browser).*$/'],
        },
        preprocessors: {
            './karma-setup.js': ['webpack'],
            ...Object.fromEntries(testFiles.map(key => [ key, ['webpack', 'sourcemap'] ]))
        },

        webpack: {
            mode: 'production',
            devtool: 'inline-source-map',
            resolve: {
                alias: {
                    fs: false,
                    module: false,
                    [Path.resolve(__dirname, 'engines/query-sparql/test/util.js')]: Path.resolve(__dirname, 'engines/query-sparql/test/util-browser.js'),
                    'jest.unmock': false,
                },
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        loader: 'ts-loader',
                        exclude: /node_modules/,
                        options: { transpileOnly: true },
                    },
                ],
            },
            plugins: [
                new NodePolyfillPlugin(),
                new webpack.DefinePlugin({
                    'process.stdout.isTTY': false,
                }),
            ],
            ignoreWarnings: [
                {
                    module: /jest/,
                },
                {
                    module: /karma-setup/,
                },
            ],
            stats: {
                colors: true,
                hash: false,
                version: false,
                timings: false,
                assets: false,
                chunks: false,
                modules: false,
                reasons: false,
                children: false,
                source: false,
                errors: false,
                errorDetails: false,
                warnings: false,
                publicPath: false,
            },
            performance: {
                hints: false,
            }
        },

        browsers: [
            'ChromeHeadless',
            'FirefoxHeadless',
        ],
    });
};
