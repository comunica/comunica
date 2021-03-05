module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname, // this is the reason this is a .js file
    project: ['./tsconfig.eslint.json'],
  },
  plugins: [
    'eslint-plugin-tsdoc',
    'eslint-plugin-import',
    'eslint-plugin-jest',
    'eslint-plugin-unused-imports'
  ],
  extends: [
    'es/node',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/resolver': {
      'typescript': {
        'alwaysTryTypes': true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/rdf-js`
      },
    }
  },
  globals: {
    window: false,
    fetch: false,
    Headers: false,
    Request: false,
    XMLHttpRequest: false,
  },
  rules: {
    // Default
    'class-methods-use-this': 'off', // Conflicts with functions from interfaces that sometimes don't require `this`
    'comma-dangle': ['error', 'always-multiline'],
    'dot-location': ['error', 'property'],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'no-underscore-dangle': 'off', // Conflicts with external libraries
    'padding-line-between-statements': 'off',
    'no-param-reassign': 'off',
    'func-style': 'off',
    'new-cap': 'off',
    'lines-around-comment': ['error', {
      beforeBlockComment: false,
      afterBlockComment: false,
      beforeLineComment: false,
      afterLineComment: false,
    }],
    'no-multi-assign': 'off',
    'no-plusplus': 'off',
    'guard-for-in': 'off',
    'sort-imports': 'off', // Disabled in favor of eslint-plugin-import
    'prefer-named-capture-group': 'off',
    'max-len': ['error', {
      code: 120,
      ignoreTemplateLiterals: true,
    }],
    'unicorn/consistent-function-scoping': 'off',
    'no-warning-comments': 'off',
    'no-mixed-operators': 'off',
    'prefer-destructuring': 'off',
    'default-case': 'off', // TSC already takes care of these checks
    'no-loop-func': 'off',
    'unicorn/no-fn-reference-in-iterator': 'off',
    'extended/consistent-err-names': 'off',
    'unicorn/prefer-replace-all': 'off',
    'unicorn/catch-error-name': ['error', { name: 'error' }],
    'unicorn/no-reduce': 'off',
    'no-duplicate-imports': 'off', // Incompatible with type imports
    'unicorn/consistent-destructuring': 'off',
    'unicorn/no-array-callback-reference': 'off',
    'unicorn/no-new-array': 'off',

    // TS
    '@typescript-eslint/lines-between-class-members': ['error', { exceptAfterSingleLine: true }],
    '@typescript-eslint/no-invalid-void-type': 'off', // breaks with default void in Asynchandler 2nd generic
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/generic-type-naming': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off', // Problems with optional parameters
    '@typescript-eslint/space-before-function-paren': ['error', 'never'],
    '@typescript-eslint/promise-function-async': 'off',
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'angle-bracket' }],
    '@typescript-eslint/member-naming': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'interface',
        'format': ['PascalCase'],
        'custom': {
          'regex': '^I[A-Z]',
          'match': true
        }
      }
    ],
    '@typescript-eslint/no-dynamic-delete': 'off',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowConciseArrowFunctionExpressionsStartingWithVoid: true,
    }],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // Import
    'import/order': ['error', {
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-unused-modules': 'off',
    'unused-imports/no-unused-imports-ts': 'error',
    'import/no-extraneous-dependencies': 'error',

    // TODO: Try to re-enable the following rules in the future
    'global-require': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'tsdoc/syntax': 'off',
    'unicorn/expiring-todo-comments': 'off',
    'unicorn/import-style': 'off',
  },
  overrides: [
    {
      // Specific rules for bin files
      files: ['**/bin/*.ts'],
      rules: {
        'unicorn/filename-case': ['error', {
          'case': 'kebabCase'
        }],
        'no-process-env': 'off',
      }
    },
    {
      // Specific rules for test files
      files: ['**/test/**/*.ts'],
      env: {
        'jest/globals': true,
      },
      globals: {
        'spyOn': false,
        'fail': false,
      },
      rules: {
        'mocha/no-synchronous-tests': 'off',
        'mocha/valid-test-description': 'off',
        'mocha/no-sibling-hooks': 'off',

        'max-statements-per-line': 'off',
        'id-length': 'off',
        'arrow-body-style': 'off',
        'line-comment-position': 'off',
        'no-inline-comments': 'off',
        'unicorn/filename-case': 'off',
        'no-new': 'off',
        'unicorn/no-nested-ternary': 'off',
        'no-return-assign': 'off',
        'no-useless-call': 'off',
        'no-sync': 'off',

        '@typescript-eslint/brace-style': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-ts-ignore': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/no-extra-parens': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        'import/no-extraneous-dependencies': 'off',
      }
    }
  ],
};
