import { RuleTester } from 'eslint';
import rule from '../../lib/eslint/require-async-iterator-autostart-false';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

describe('require-async-iterator-autostart-false', () => {
  it('should pass valid cases', () => {
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
        // Valid: no arguments (e.g., some constructors may not require options)
        {
          code: 'const it = new EmptyIterator();',
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
      ],
    });
  });
});
