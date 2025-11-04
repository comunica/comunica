import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';

import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { Bindings, IActionContext, IQueryOperationResult, IJoinEntry, ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Path Seq Query Operation Actor.
 */
export class ActorQueryOperationPathSeq extends ActorAbstractPath {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationPathSeq) {
    super(args, Algebra.Types.SEQ);
    this.mediatorJoin = args.mediatorJoin;
  }

  public async runOperation(
    operationOriginal: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const predicate = <Algebra.Seq> operationOriginal.predicate;

    let joiner: RDF.Term = operationOriginal.subject;
    const generatedVariableNames: RDF.Variable[] = [];
    const entries: IJoinEntry[] = await Promise.all(predicate.input
      .map((subPredicate, i) => {
        const nextJoiner = i === predicate.input.length - 1 ? <RDF.Variable> operationOriginal.object : this.generateVariable(dataFactory, operationOriginal, `b${i}`);
        const operation = algebraFactory
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
        output: getSafeBindings(await output),
        operation,
      })));

    const join = getSafeBindings(await this.mediatorJoin
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
          .some(generatedVariableName => generatedVariableName.value === variable.variable.value));
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
