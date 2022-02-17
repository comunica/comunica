import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
} from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { Bindings, IActionContext, IQueryOperationResult, IJoinEntry } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Seq Query Operation Actor.
 */
export class ActorQueryOperationPathSeq extends ActorAbstractPath {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationPathSeq) {
    super(args, Algebra.types.SEQ);
  }

  public async runOperation(
    operationOriginal: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const predicate = <Algebra.Seq> operationOriginal.predicate;

    let joiner: RDF.Term = operationOriginal.subject;
    const generatedVariableNames: RDF.Variable[] = [];
    const entries: IJoinEntry[] = await Promise.all(predicate.input
      .map((subPredicate, i) => {
        const nextJoiner = i === predicate.input.length - 1 ? <RDF.Variable> operationOriginal.object : this.generateVariable(operationOriginal, `b${i}`);
        const operation = ActorAbstractPath.FACTORY
          .createPath(joiner, subPredicate, nextJoiner, operationOriginal.graph);
        const output = this.mediatorQueryOperation.mediate({
          context,
          operation,
        });

        joiner = nextJoiner;
        if (i < predicate.input.length - 1) {
          generatedVariableNames.push(nextJoiner);
        }

        return { output, operation };
      })
      .map(async({ output, operation }) => ({
        output: ActorQueryOperation.getSafeBindings(await output),
        operation,
      })));

    const join = ActorQueryOperation.getSafeBindings(await this.mediatorJoin
      .mediate({ type: 'inner', entries, context }));
    // Remove the generated variable from the bindings
    const bindingsStream = join.bindingsStream.transform<Bindings>({
      transform(item, next, push) {
        for (const generatedVariableName of generatedVariableNames) {
          item = item.delete(generatedVariableName);
        }
        push(item);
        next();
      },
    });

    // Remove the generated variable from the list of variables
    return {
      type: 'bindings',
      bindingsStream,
      async metadata() {
        const joinMetadata = await join.metadata();
        const variables = joinMetadata.variables.filter(variable => !generatedVariableNames
          .some(generatedVariableName => generatedVariableName.value === variable.value));
        return { ...joinMetadata, variables };
      },
    };
  }
}

export interface IActorQueryOperationPathSeq extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
