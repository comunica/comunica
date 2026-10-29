import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Path to Patterns Optimize Query Operation Actor.
 *
 * Rewrites the parts of property paths that need no path evaluation into regular operations,
 * as defined for the evaluation of property paths in SPARQL 1.1:
 * links become quad patterns, inverse paths swap their subject and object,
 * sequences become joins over fresh variables that are projected away, and alternatives become unions.
 * Arbitrary-length paths, zero-or-one paths and negated property sets remain paths.
 */
export class ActorOptimizeQueryOperationPathToPatterns extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    let variableCounter = 0;
    const generateVariable = (): RDF.Variable => dataFactory.variable(`__comunica:path${variableCounter++}`);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false }),
        transform: pathOp => ActorOptimizeQueryOperationPathToPatterns.rewritePath(
          algebraFactory,
          generateVariable,
          pathOp,
        ),
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Rewrite the given path into regular operations where possible.
   * @param algebraFactory The algebra factory.
   * @param generateVariable A function that returns a variable that does not occur in the query yet.
   * @param path A path.
   */
  public static rewritePath(
    algebraFactory: AlgebraFactory,
    generateVariable: () => RDF.Variable,
    path: Algebra.Path,
  ): Algebra.Operation {
    const { subject, predicate, object, graph } = path;
    const subPath = (
      pathSubject: RDF.Term,
      pathPredicate: Algebra.Operation,
      pathObject: RDF.Term,
    ): Algebra.Operation => ActorOptimizeQueryOperationPathToPatterns.rewritePath(
      algebraFactory,
      generateVariable,
      algebraFactory.createPath(pathSubject, <any> pathPredicate, pathObject, graph),
    );
    switch (predicate.type) {
      case Algebra.Types.LINK: {
        const link = <Algebra.Link> predicate;
        return Object.assign(
          algebraFactory.createPattern(subject, link.iri, object, graph),
          { metadata: link.metadata },
        );
      }
      case Algebra.Types.INV:
        return subPath(object, (<Algebra.Inv> predicate).path, subject);
      case Algebra.Types.SEQ: {
        const input = (<Algebra.Seq> predicate).input;
        const entries: Algebra.Operation[] = [];
        let joiner = subject;
        for (const [ i, subPredicate ] of input.entries()) {
          const next = i === input.length - 1 ? object : generateVariable();
          entries.push(subPath(joiner, subPredicate, next));
          joiner = next;
        }
        const variables = <RDF.Variable[]> [ subject, object, graph ]
          .filter((term, i, terms) => term.termType === 'Variable' &&
            terms.findIndex(other => other.equals(term)) === i);
        return algebraFactory.createProject(algebraFactory.createJoin(entries), variables);
      }
      case Algebra.Types.ALT:
        return algebraFactory.createUnion((<Algebra.Alt> predicate).input
          .map(subPredicate => subPath(subject, subPredicate, object)));
      default:
        return path;
    }
  }
}
