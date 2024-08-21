import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { bool, compactTermString, merge, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { AsyncExtensionFunctionCreator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { runFuncTestTable } from '../util';

const DF = new DataFactory();

describe('extension functions:', () => {
  describe('term-equal', () => {
    const extensionFunctions: AsyncExtensionFunctionCreator = async(functionNamedNode: RDF.NamedNode) => {
      if (functionNamedNode.value === 'https://example.org/functions#equal') {
        return async(args: RDF.Term[]) => {
          const res = args[0].equals(args[1]);
          const booleanType = DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean');
          if (res) {
            return DF.literal('true', booleanType);
          }
          return DF.literal('false', booleanType);
        };
      }
      if (functionNamedNode.value === 'https://example.org/functions#bad') {
        return async(args: RDF.Term[]) => {
          throw new Error('error');
        };
      }
    };

    describe('Can be evaluated', () => {
      runFuncTestTable({
        arity: 2,
        notation: Notation.Function,
        operation: '<https://example.org/functions#equal>',
        config: new ActionContext().set(KeysInitQuery.extensionFunctionCreator, extensionFunctions),
        aliases: merge(numeric, bool),
        testTable: `
          3i 3i = true
          3d 3d = true
          3f 3f = true
        
          3i -5i = false
          3d -5d = false
          3f -5f = false
        
          3i 3f = false
          3i 3d = false
          3d 3f = false
          -0f 0f = false
        
          INF  INF = true
          -INF -INF = true
          INF  3f  = false
          3f   INF = false
          INF  NaN = false
          NaN  NaN = true
          NaN  3f  = false
          3f   NaN = false
          `,
      });
    });

    describe('throws error when not providing implementation', () => {
      const errorTable: (e: string) => string = e => `
        3i 3i = ${e}
        3d 3d = ${e}
        3f 3f = ${e}
      
        3i -5i = ${e}
        3d -5d = ${e}
        3f -5f = ${e}
      
        3i 3f = ${e}
        3i 3d = ${e}
        3d 3f = ${e}
        -0f 0f = ${e}
      
        INF  INF = ${e}
        -INF -INF = ${e}
        INF  3f  = ${e}
        3f   INF = ${e}
        INF  NaN = ${e}
        NaN  NaN = ${e}
        NaN  3f  = ${e}
        3f   NaN = ${e}
        `;
      runFuncTestTable({
        arity: 2,
        notation: Notation.Function,
        operation: '<https://example.org/functions#equal>',
        aliases: numeric,
        errorTable: errorTable('Unknown named operator'),
      });
    });

    describe('throws error when providing a failing implementation', () => {
      runFuncTestTable({
        arity: 1,
        notation: Notation.Function,
        operation: '<https://example.org/functions#bad>',
        config: new ActionContext({
          [KeysInitQuery.extensionFunctionCreator.name]: extensionFunctions,
        }),
        aliases: merge(numeric, bool),
        errorTable: `
          3i = 'Error thrown in https://example.org/functions#bad'
          `,
      });
    });

    describe('upper case', () => {
      const stringType = DF.namedNode('http://www.w3.org/2001/XMLSchema#string');
      runFuncTestTable({
        arity: 1,
        notation: Notation.Function,
        operation: '<http://example.org/functions#to-upper-case>',
        config: new ActionContext({
          [KeysInitQuery.extensionFunctionCreator.name]: () => async(args: RDF.Term[]) => {
            const arg = args[0];
            if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
              return DF.literal(arg.value.toUpperCase(), stringType);
            }
            return arg;
          },
        }),
        aliases: merge(numeric, bool),
        testTable: `
          ${compactTermString('AppLe', `<${stringType.value}>`)} = ${compactTermString('APPLE', stringType.value)}
          `,
      });
    });
  });
});
