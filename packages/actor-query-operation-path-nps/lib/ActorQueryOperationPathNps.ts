import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import { termToString } from 'rdf-string';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Nps Query Operation Actor.
 */
export class ActorQueryOperationPathNps extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.NPS);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const predicate = <Algebra.Nps> path.predicate;
    const blank = this.generateVariable(path);
    const blankName = termToString(blank);

    const pattern = ActorAbstractPath.FACTORY.createPattern(path.subject, blank, path.object, path.graph);
    const output = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern, context }),
    );

    // Remove the generated blank nodes from the bindings
    const bindingsStream = output.bindingsStream.transform<Bindings>({
      filter(bindings) {
        return !predicate.iris.some(iri => iri.equals(bindings.get(blankName)));
      },
      transform(item, next, push) {
        push(item.delete(blankName));
        next();
      },
    });

    return { type: 'bindings', bindingsStream, variables: output.variables, canContainUndefs: false };
  }
}
