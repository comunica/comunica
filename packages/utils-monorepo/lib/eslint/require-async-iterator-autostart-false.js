/**
 * ESLint rule to enforce autoStart: false on AsyncIterator construction.
 * This prevents regressions related to unintended auto-starting of iterators.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce autoStart: false when constructing AsyncIterators',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingAutoStart: 'AsyncIterator construction must include "autoStart: false" option',
      autoStartTrue: 'AsyncIterator construction must not use "autoStart: true", use "autoStart: false" instead',
    },
    schema: [],
    fixable: 'code',
  },

  create(context) {
    // List of AsyncIterator class names from asynciterator package
    // Note: EmptyIterator and SingletonIterator are excluded because they don't accept options
    const iteratorClasses = new Set([
      'AsyncIterator',
      'ArrayIterator',
      'BufferedIterator',
      'ClonedIterator',
      'IntegerIterator',
      'MultiTransformIterator',
      'SimpleTransformIterator',
      'TransformIterator',
      'UnionIterator',
    ]);

    return {
      NewExpression(node) {
        // Check if this is a constructor call to an AsyncIterator class
        const calleeName = node.callee.name;
        if (!iteratorClasses.has(calleeName)) {
          return;
        }

        // Check if there are arguments
        if (node.arguments.length === 0) {
          return;
        }

        // Find the options argument (usually the last argument that's an object)
        const lastArg = node.arguments.at(-1);

        // If the last argument is not an object, autoStart is missing
        if (!lastArg || lastArg.type !== 'ObjectExpression') {
          context.report({
            node,
            messageId: 'missingAutoStart',
            fix(fixer) {
              const lastArgument = node.arguments.at(-1);
              return fixer.insertTextAfter(lastArgument, ', { autoStart: false }');
            },
          });
          return;
        }

        // Check if autoStart property exists in the options object
        const autoStartProperty = lastArg.properties.find(prop =>
          prop.type === 'Property' &&
          prop.key &&
          (prop.key.name === 'autoStart' || (prop.key.type === 'Literal' && prop.key.value === 'autoStart')),
        );

        if (!autoStartProperty) {
          context.report({
            node,
            messageId: 'missingAutoStart',
            fix(fixer) {
              if (lastArg.properties.length === 0) {
                return fixer.replaceText(lastArg, '{ autoStart: false }');
              }
              const lastProp = lastArg.properties.at(-1);
              return fixer.insertTextAfter(lastProp, ', autoStart: false');
            },
          });
          return;
        }

        // Check if autoStart is set to true
        if (autoStartProperty.value.type === 'Literal' && autoStartProperty.value.value === true) {
          context.report({
            node,
            messageId: 'autoStartTrue',
            fix(fixer) {
              return fixer.replaceText(autoStartProperty.value, 'false');
            },
          });
        }
      },
    };
  },
};
