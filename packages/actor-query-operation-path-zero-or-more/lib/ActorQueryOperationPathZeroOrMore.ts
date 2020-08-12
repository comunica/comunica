import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import {
  Bindings, IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import { ActionContext } from '@comunica/core';
import { MultiTransformIterator, TransformIterator, EmptyIterator, BufferedIterator } from 'asynciterator';

import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path ZeroOrMore Query Operation Actor.
 */
export class ActorQueryOperationPathZeroOrMore extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.ZERO_OR_MORE_PATH);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const distinct = await this.isPathArbitraryLengthDistinct(context, path);
    if (distinct.operation) {
      return distinct.operation;
    }

    context = distinct.context;

    const predicate = <Algebra.ZeroOrMorePath> path.predicate;

    const sVar = path.subject.termType === 'Variable';
    const oVar = path.object.termType === 'Variable';

    if (sVar && oVar) {
      // Get all the results of subjects, then fill in first variable for those
      const predVar = this.generateVariable(path);
      const single = ActorAbstractPath.FACTORY.createPattern(path.subject, predVar, path.object, path.graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ context, operation: single }),
      );
      const subjectString = termToString(path.subject);
      const objectString = termToString(path.object);

      const entities: Set<string|undefined> = new Set();

      const termHashes = {};

      const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(
        results.bindingsStream,
        {
          multiTransform: (bindings: Bindings) => {
            const subject = bindings.get(subjectString);
            const object = bindings.get(objectString);
            return new TransformIterator<Bindings>(
              async() => {
                if (entities.has(termToString(subject)) && entities.has(termToString(object))) {
                  return new EmptyIterator();
                }
                const it = new BufferedIterator<Bindings>();
                if (!entities.has(termToString(subject))) {
                  entities.add(termToString(subject));
                  await this.ALPTwoVariables(
                    subjectString,
                    objectString,
                    subject,
                    subject,
                    predicate.path,
                    context,
                    termHashes,
                    it,
                    { count: 0 },
                  );
                }
                if (!entities.has(termToString(object))) {
                  entities.add(termToString(object));
                  await this.ALPTwoVariables(
                    subjectString,
                    objectString,
                    object,
                    object,
                    predicate.path,
                    context,
                    termHashes,
                    it,
                    { count: 0 },
                  );
                }
                return it.transform<Bindings>({
                  transform(item, next, push) {
                    push(item);
                    next();
                  },
                });
              },
            );
          },
        },
      );
      return { type: 'bindings', bindingsStream, variables: [ subjectString, objectString ]};
    }
    if (!sVar && !oVar) {
      const bindingsStream = (await this.ALPeval(path.subject, predicate.path, context))
        .transform<Bindings>({
        filter: item => item.equals(path.object),
        transform(item, next, push) {
          push(Bindings({ }));
          next();
        },
      });
      return { type: 'bindings', bindingsStream, variables: []};
    }
    // If (sVar || oVar)
    const value = termToString(sVar ? path.subject : path.object);
    const pred = sVar ? ActorAbstractPath.FACTORY.createInv(predicate.path) : predicate.path;
    const bindingsStream = (await this.ALPeval(sVar ? path.object : path.subject, pred, context))
      .transform<Bindings>({
      transform(item, next, push) {
        push(Bindings({ [value]: item }));
        next();
      },
    });

    return { type: 'bindings', bindingsStream, variables: [ value ]};
  }
}
