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

        'no-sync': 'off',
        // Issue #95 pointed out this can be disabled here. https://eslint.org/docs/rules/no-implicit-globals
        'no-implicit-globals': 'off',
        // 'At' is not yet supported by nodejs when disabling this.
        'unicorn/prefer-at': 'off',
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
