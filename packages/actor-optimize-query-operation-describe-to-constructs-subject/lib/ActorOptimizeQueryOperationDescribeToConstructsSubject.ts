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
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Describe To Constructs Subject Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationDescribeToConstructsSubject extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    // Describes can be wrapped in a FROM (NAMED) dataset or a LIMIT/OFFSET slice,
    // so they are not necessarily the outermost operation
    let found = false;
    algebraUtils.visitOperation(action.operation, {
      [Algebra.Types.DESCRIBE]: { preVisitor: () => {
        found = true;
        return { continue: false };
      } },
    });
    if (!found) {
      return failTest(
        `Actor ${this.name} only supports operations containing a describe, but got ${action.operation.type}`,
      );
    }
    return passTest(true);
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Describes can be wrapped in a FROM (NAMED) dataset or a LIMIT/OFFSET slice,
    // so they are not necessarily the outermost operation
    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.DESCRIBE]: {
        // Describes can not be nested, so there is no need to look inside of one
        preVisitor: () => ({ continue: false }),
        transform: describe => this.describeToConstructs(describe, dataFactory, algebraFactory),
      },
    });

    return { operation, context: action.context };
  }

  /**
   * Rewrite a describe operation into a union of construct operations.
   * @param {Algebra.Describe} operationOriginal The describe operation to rewrite.
   * @param {ComunicaDataFactory} dataFactory The data factory.
   * @param {AlgebraFactory} algebraFactory The algebra factory.
   */
  protected describeToConstructs(
    operationOriginal: Algebra.Describe,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ): Algebra.Operation {
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
        const templateOperation = algebraFactory.createBgp(<Algebra.Pattern[]> patterns);

        // Create a construct query
        return algebraFactory.createConstruct(templateOperation, <Algebra.Pattern[]> patterns);
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
      operations.push(algebraFactory.createConstruct(
        algebraFactory.createJoin([ operationOriginal.input, algebraFactory.createBgp(variablePatterns) ]),
        variablePatterns,
      ));
    }

    // Union the construct operations
    return algebraFactory.createUnion(operations, false);
  }
}
