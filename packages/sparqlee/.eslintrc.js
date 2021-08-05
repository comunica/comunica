module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname, // this is the reason this is a .js file
        project: ['./tsconfig.eslint.json'],
    },
    extends: [
        '@rubensworks'
    ],
    rules: {
        'no-implicit-coercion': 'off',

        // should stay off
        'mocha/no-exports': 'off',
        'mocha/no-skipped-tests': 'off',

        // TODO: use native datastructures instead of those provided by Immutable. Issue #94
        'no-redeclare': 'off',
        'no-sync': 'off',
        // TODO: stop using global functions + ignore tests folder. Issue #95
        'no-implicit-globals': 'off',
    },
    overrides: [
        {
            files: ['**/bin/*.ts'],
            rules: {
                'unicorn/prefer-top-level-await': 'off',
            },
        },
        {
            files: ['**/test/**/*.ts'],
            rules: {
                'no-implicit-globals': 'off',
            },
        }
    ],
};
