import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Algebra, Factory } from 'sparqlalgebrajs';

/**
 * A comunica Describe To Constructs Subject Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationDescribeToConstructsSubject extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    if (action.operation.type !== Algebra.types.DESCRIBE) {
      return failTest(`Actor ${this.name} only supports describe operations, but got ${action.operation.type}`);
    }
    return passTest(true);
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    const operationOriginal: Algebra.Describe = <Algebra.Describe> action.operation;

    // Create separate construct queries for all non-variable terms
    const operations: Algebra.Construct[] = operationOriginal.terms
      .filter(term => term.termType !== 'Variable')
      .map((term: RDF.Term) => {
        // Transform each term to a separate construct operation with S ?p ?o patterns (BGP) for all terms
        const patterns: RDF.BaseQuad[] = [
          dataFactory.quad(
            <RDF.Quad_Subject> term,
            dataFactory.variable('__predicate'),
            dataFactory.variable('__object'),
          ),
        ];

        // eslint-disable-next-line unicorn/no-array-for-each
        patterns.forEach((templatePattern: any) => templatePattern.type = 'pattern');
        const templateOperation: Algebra.Operation = {
          type: Algebra.types.BGP,
          patterns: <Algebra.Pattern[]> patterns,
        };

        // Create a construct query
        return <Algebra.Construct> {
          input: templateOperation,
          template: <Algebra.Pattern[]> patterns,
          type: 'construct',
        };
      });

    // If we have variables in the term list,
    // create one separate construct operation to determine these variables using the input pattern.
    if (operations.length !== operationOriginal.terms.length) {
      let variablePatterns: Algebra.Pattern[] = [];
      operationOriginal.terms
        .filter(term => term.termType === 'Variable')
        // eslint-disable-next-line unicorn/no-array-for-each
        .forEach((term: RDF.Term, i: number) => {
          // Transform each term to an S ?p ?o pattern in a non-conflicting way
          const patterns: RDF.BaseQuad[] = [
            dataFactory.quad(
              <RDF.Quad_Subject> term,
              dataFactory.variable(`__predicate${i}`),
              dataFactory.variable(`__object${i}`),
            ),
          ];

          // eslint-disable-next-line unicorn/no-array-for-each
          patterns.forEach((templatePattern: any) => templatePattern.type = 'pattern');
          variablePatterns = [ ...variablePatterns, ...<Algebra.Pattern[]> patterns ];
        });

      // Add a single construct for the variables
      // This requires a join between the input pattern and our variable patterns that form a simple BGP
      operations.push({
        input: {
          type: Algebra.types.JOIN,
          input: [
            operationOriginal.input,
            { type: Algebra.types.BGP, patterns: variablePatterns },
          ],
        },
        template: variablePatterns,
        type: Algebra.types.CONSTRUCT,
      });
    }

    // Union the construct operations
    const operation = algebraFactory.createUnion(operations, false);

    return { operation, context: action.context };
  }
}
