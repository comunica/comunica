import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { SyncExtensionFunctionCreator } from '../../../lib/evaluators/SyncEvaluator';
import { bool, merge, numeric } from '../../util/Aliases';
import type { GeneralEvaluationConfig } from '../../util/generalEvaluation';
import { generalEvaluate } from '../../util/generalEvaluation';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

const BF = new BindingsFactory();

describe('extension functions:', () => {
  describe('term-equal', () => {
    const extensionFunctions: SyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => {
      if (functionNamedNode.value === 'https://example.org/functions#equal') {
        return (args: RDF.Term[]) => {
          const res = args[0].equals(args[1]);
          const DF = new DataFactory();
          const booleanType = DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean');
          if (res) {
            return DF.literal('true', booleanType);
          }
          return DF.literal('false', booleanType);
        };
      }
      if (functionNamedNode.value === 'https://example.org/functions#bad') {
        return (args: RDF.Term[]) => {
          throw new Error('error');
        };
      }
    };

    describe('Can be evaluated', () => {
      const generalEvaluationConfig: GeneralEvaluationConfig = { type: 'sync', config: {
        extensionFunctionCreator: extensionFunctions,
      }};
      runTestTable({
        arity: 2,
        notation: Notation.Function,
        operation: '<https://example.org/functions#equal>',
        config: generalEvaluationConfig,
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
      runTestTable({
        arity: 2,
        notation: Notation.Function,
        operation: '<https://example.org/functions#equal>',
        aliases: numeric,
        errorTable: errorTable('Unknown named operator'),
      });
    });

    describe('throws error when providing a failing implementation', () => {
      const generalEvaluationConfig: GeneralEvaluationConfig = { type: 'sync', config: {
        extensionFunctionCreator: extensionFunctions,
      }};
      runTestTable({
        arity: 1,
        notation: Notation.Function,
        operation: '<https://example.org/functions#bad>',
        config: generalEvaluationConfig,
        aliases: merge(numeric, bool),
        errorTable: `
          3i = 'Error thrown in https://example.org/functions#bad'
          `,
      });
    });

    it('upper case', async() => {
      const complexQuery = `PREFIX func: <http://example.org/functions#>
        SELECT ?caps WHERE {
              ?s ?p ?o.
              BIND (func:to-upper-case(?o) AS ?caps)
        }`;
      const DF = new DataFactory();
      const stringType = DF.namedNode('http://www.w3.org/2001/XMLSchema#string');
      const creator = () => (args: RDF.Term[]) => {
        const arg = args[0];
        if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
          return DF.literal(arg.value.toUpperCase(), stringType);
        }
        return arg;
      };
      const bindings = BF.bindings([
        [ DF.variable('o'), DF.literal('AppLe', stringType) ],
      ]);
      const generalEvaluationConfig: GeneralEvaluationConfig = {
        type: 'sync',
        config: { extensionFunctionCreator: creator },
      };
      const evaluated = await generalEvaluate({
        expression: complexQuery,
        expectEquality: true,
        generalEvaluationConfig,
        bindings,
      });
      expect(evaluated.asyncResult).toEqual(DF.literal('APPLE', stringType));
    });
  });
});
