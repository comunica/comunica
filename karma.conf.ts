import { webkit } from '@playwright/test';
import * as NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import { DefinePlugin } from 'webpack';

const testFiles = [
  'engines/query-sparql/test/QuerySparql-test.ts',
];

process.env.WEBKIT_HEADLESS_BIN = webkit.executablePath();

// Based on https://github.com/tom-sherman/blog/blob/main/posts/02-running-jest-tests-in-a-browser.md
function defineConfig(config: any): void {
  config.set({
    basePath: __dirname,
    plugins: [
      'karma-webpack',
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-webkit-launcher',
      'karma-sourcemap-loader',
      'karma-jasmine-html-reporter',
    ],
    frameworks: [ 'jasmine', 'webpack' ],
    files: [ './karma.setup.ts', ...testFiles ],
    client: {
      args: [ '--grep', '/^(?!.*no browser).*$/' ],
    },
    preprocessors: {
      './karma.setup.ts': [ 'webpack' ],
      ...Object.fromEntries(testFiles.map(testFile => [ testFile, [ 'webpack', 'sourcemap' ]])),
    },
    webpack: {
      devtool: 'inline-source-map',
      mode: 'production',
      module: {
        rules: [
          {
            test: /\.ts$/u,
            loader: 'ts-loader',
            exclude: /node_modules/u,
            options: { transpileOnly: true },
          },
        ],
      },
      plugins: [
        new NodePolyfillPlugin({
          additionalAliases: [
            'process',
          ],
        }),
        new DefinePlugin({ 'process.stdout.isTTY': false }),
      ],
      resolve: {
        alias: {
          fs: false,
          module: false,
          'jest.unmock': false,
        },
        extensions: [ '.js', '.ts' ],
      },
    },
    browsers: [
      'ChromeHeadless',
      'FirefoxHeadless',
      'WebkitHeadless',
    ],
  });
};

export default defineConfig;
