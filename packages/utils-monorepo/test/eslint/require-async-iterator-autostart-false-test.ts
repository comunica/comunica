import { RuleTester } from 'eslint';

const rule = require('../../lib/eslint/require-async-iterator-autostart-false');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

describe('require-async-iterator-autostart-false', () => {
  ruleTester.run('require-async-iterator-autostart-false', rule, {
    valid: [
      // Valid: autoStart: false is present
      {
        code: 'const it = new ArrayIterator([], { autoStart: false });',
      },
      {
        code: 'const it = new AsyncIterator({ autoStart: false });',
      },
      {
        code: 'const it = new BufferedIterator({ autoStart: false });',
      },
      {
        code: 'const it = new UnionIterator(iterators, { autoStart: false });',
      },
      // Valid: not an AsyncIterator class
      {
        code: 'const obj = new SomeOtherClass({ autoStart: true });',
      },
      {
        code: 'const obj = new MyIterator({});',
      },
      // Valid: EmptyIterator and SingletonIterator don't accept options
      {
        code: 'const it = new EmptyIterator();',
      },
      {
        code: 'const it = new SingletonIterator(item);',
      },
      // Valid: Iterator with no arguments (edge case - should be ignored)
      {
        code: 'const it = new ArrayIterator();',
      },
    ],

    invalid: [
      // Invalid: missing autoStart property
      {
        code: 'const it = new ArrayIterator([]);',
        errors: [{ messageId: 'missingAutoStart' }],
        output: 'const it = new ArrayIterator([], { autoStart: false });',
      },
      {
        code: 'const it = new ArrayIterator([], {});',
        errors: [{ messageId: 'missingAutoStart' }],
        output: 'const it = new ArrayIterator([], { autoStart: false });',
      },
      {
        code: 'const it = new BufferedIterator({ maxBufferSize: 10 });',
        errors: [{ messageId: 'missingAutoStart' }],
        output: 'const it = new BufferedIterator({ maxBufferSize: 10, autoStart: false });',
      },
      {
        code: 'const it = new UnionIterator(iterators, { optional: true });',
        errors: [{ messageId: 'missingAutoStart' }],
        output: 'const it = new UnionIterator(iterators, { optional: true, autoStart: false });',
      },
      // Invalid: autoStart: true
      {
        code: 'const it = new ArrayIterator([], { autoStart: true });',
        errors: [{ messageId: 'autoStartTrue' }],
        output: 'const it = new ArrayIterator([], { autoStart: false });',
      },
      {
        code: 'const it = new AsyncIterator({ autoStart: true });',
        errors: [{ messageId: 'autoStartTrue' }],
        output: 'const it = new AsyncIterator({ autoStart: false });',
      },
      // Invalid: autoStart as literal key (edge case)
      {
        code: 'const it = new ArrayIterator([], { ["autoStart"]: true });',
        errors: [{ messageId: 'autoStartTrue' }],
        output: 'const it = new ArrayIterator([], { ["autoStart"]: false });',
      },
    ],
  });
});
