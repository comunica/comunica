import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { getSafeBindings, getSafeQuads } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import * as RdfString from 'rdf-string';

/**
 * A comunica Distinct Identity Query Operation Actor.
 */
export class ActorQueryOperationDistinctIdentity extends ActorQueryOperationTypedMediated<Algebra.Distinct> {
  public constructor(args: IActorQueryOperationDistinctIdentityArgs) {
    super(args, 'distinct');
  }

  public async testOperation(_operation: Algebra.Distinct, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Distinct, context: IActionContext): Promise<IQueryOperationResult> {
    const output = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });

    if (output.type === 'quads') {
      const outputQuads: IQueryOperationResultQuads = getSafeQuads(
        output,
      );

      const quadStream: AsyncIterator<RDF.Quad> = outputQuads.quadStream
        .filter(await this.newIdentityFilterQuads());
      return {
        type: 'quads',
        quadStream,
        metadata: outputQuads.metadata,
      };
    }

    const outputBindings: IQueryOperationResultBindings = getSafeBindings(
      output,
    );

    const variables = (await outputBindings.metadata()).variables.map(v => v.variable);
    const bindingsStream: BindingsStream = outputBindings.bindingsStream
      .filter(await this.newIdentityFilter(variables));
    return {
      type: 'bindings',
      bindingsStream,
      metadata: outputBindings.metadata,
    };
  }

  /**
   * Create a new distinct filter function.
   * This will maintain an internal Identity datastructure so that every bindings object only returns true once.
   * @param variables The variables to take into account while hashing.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public async newIdentityFilter(
    variables: RDF.Variable[],
  ): Promise<(bindings: Bindings) => boolean> {
    const identities: Record<string, boolean> = {};
    return (bindings: Bindings) => {
      const identity: string = variables.map(v => RdfString.termToString(bindings.get(v))).join('-');
      return !(identity in identities) && (identities[identity] = true);
    };
  }

  /**
   * Create a new distinct filter function to Identity quads.
   * This will maintain an internal Identity datastructure so that every quad object only returns true once.
   * @return {(quad: RDF.Quad) => boolean} A distinct filter for quads.
   */
  public async newIdentityFilterQuads(): Promise<(quad: RDF.Quad) => boolean> {
    const identities: Record<string, boolean> = {};
    return (quad: RDF.Quad) => {
      const identity = Object.values(RdfString.quadToStringQuad(quad)).join(' ');
      return !(identity in identities) && (identities[identity] = true);
    };
  }
}

export interface IActorQueryOperationDistinctIdentityArgs extends IActorQueryOperationTypedMediatedArgs {
}
