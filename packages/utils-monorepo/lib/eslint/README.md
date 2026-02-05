# ESLint Rules

This directory contains custom ESLint rules for Comunica.

## require-async-iterator-autostart-false

Enforces that all AsyncIterator constructors (including subclasses like `ArrayIterator`, `BufferedIterator`, etc.) must include the `autoStart: false` option.

### Usage

In your `eslint.config.js`:

```javascript
const requireAsyncIteratorAutostartFalse = require('@comunica/utils-monorepo/eslint/require-async-iterator-autostart-false');

module.exports = config([
  {
    plugins: {
      'comunica-rules': {
        rules: {
          'require-async-iterator-autostart-false': requireAsyncIteratorAutostartFalse,
        },
      },
    },
    rules: {
      'comunica-rules/require-async-iterator-autostart-false': 'error',
    },
  },
  // ... other config
]);
```

### Auto-fix

This rule supports auto-fixing with the `--fix` flag:

```bash
eslint . --fix
```

### Examples

❌ **Incorrect:**
```javascript
new ArrayIterator([1, 2, 3])
new ArrayIterator([1, 2, 3], {})
new BufferedIterator({ maxBufferSize: 10 })
new ArrayIterator([1, 2, 3], { autoStart: true })
```

✅ **Correct:**
```javascript
new ArrayIterator([1, 2, 3], { autoStart: false })
new BufferedIterator({ maxBufferSize: 10, autoStart: false })
```
