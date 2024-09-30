import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  BindingsStream,
  IQueryOperationResultBindings,
  IActionContext,
  IQueryOperationResult,
  MetadataBindings,
  MetadataQuads,
  IQueryOperationResultQuads,
  MetadataVariable,
} from '@comunica/types';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings, getSafeQuads } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { UnionIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Union Query Operation Actor.
 */
export class ActorQueryOperationUnion extends ActorQueryOperationTypedMediated<Algebra.Union> {
  public readonly mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;

  public constructor(args: IActorQueryOperationUnionArgs) {
    super(args, 'union');
  }

  /**
   * Takes the union of the given double array variables.
   * Uniqueness is guaranteed.
   * @param {string[][]} variables Double array of variables to take the union of.
   * @return {string[]} The union of the given variables.
   */
  public static unionVariables(variables: MetadataVariable[][]): MetadataVariable[] {
    const variablesIndexed: Record<string, { variable: RDF.Variable; canBeUndef: boolean; occurrences: number }> = {};
    for (const variablesA of variables) {
      for (const variable of variablesA) {
        if (!variablesIndexed[variable.variable.value]) {
          variablesIndexed[variable.variable.value] = {
            variable: variable.variable,
            canBeUndef: variable.canBeUndef,
            occurrences: 0,
          };
        }
        const entry = variablesIndexed[variable.variable.value];
        entry.canBeUndef = entry.canBeUndef || variable.canBeUndef;
        entry.occurrences++;
      }
    }
    return Object.values(variablesIndexed)
      .map(entry => entry.occurrences === variables.length ?
          { variable: entry.variable, canBeUndef: entry.canBeUndef } :
          { variable: entry.variable, canBeUndef: true });
  }

  /**
   * Takes the union of the given metadata array.
   * It will ensure that the cardinality metadata value is properly calculated.
   * @param {{[p: string]: any}[]} metadatas Array of metadata.
   * @param bindings If the union of the variables field should also be taken.
   * @param context The action context
   * @param mediatorRdfMetadataAccumulate Mediator for metadata accumulation
   * @return {{[p: string]: any}} Union of the metadata.
   */
  public static async unionMetadata<
    Bindings extends boolean,
    M extends (Bindings extends true ? MetadataBindings : MetadataQuads),
  >(
    metadatas: M[],
    bindings: Bindings,
    context: IActionContext,
    mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate,
    // eslint-disable-next-line function-paren-newline
  ): Promise<M> {
    let accumulatedMetadata: M = <M> (await mediatorRdfMetadataAccumulate
      .mediate({ mode: 'initialize', context })).metadata;

    // Accumulate cardinality
    for (const appendingMetadata of metadatas) {
      accumulatedMetadata = <any> {
        ...appendingMetadata,
        ...(await mediatorRdfMetadataAccumulate
          .mediate({
            mode: 'append',
            accumulatedMetadata: <any> accumulatedMetadata,
            appendingMetadata: <any> appendingMetadata,
            context,
          })).metadata,
      };
    }

    // Create new metadata state
    accumulatedMetadata.state = new MetadataValidationState();

    // Propagate metadata invalidations
    const invalidateListener = (): void => accumulatedMetadata.state.invalidate();
    for (const metadata of metadatas) {
      metadata.state.addInvalidateListener(invalidateListener);
    }

    // Union variables
    if (bindings) {
      const variables: MetadataVariable[][] = metadatas.map(metadata => metadata.variables);
      accumulatedMetadata.variables = ActorQueryOperationUnion.unionVariables(variables);
    }

    return accumulatedMetadata;
  }

  public async testOperation(_operation: Algebra.Union, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Union, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Determine the type over which we are taking a union
    const outputsRaw = await Promise.all(operation.input
      .map(subOperation => this.mediatorQueryOperation.mediate({ operation: subOperation, context })));
    let outputType: string | undefined;
    for (const output of outputsRaw) {
      if (outputType === undefined) {
        outputType = output.type;
      } else if (outputType !== output.type) {
        throw new Error(`Unable to union ${outputType} and ${output.type}`);
      }
    }

    // Handle bindings
    if (outputType === 'bindings' || operation.input.length === 0) {
      const outputs: IQueryOperationResultBindings[] = outputsRaw.map(getSafeBindings);

      const bindingsStream: BindingsStream = new UnionIterator(outputs.map(
        (output: IQueryOperationResultBindings) => output.bindingsStream,
      ), { autoStart: false });

      const metadata: () => Promise<MetadataBindings> = () => Promise.all(outputs.map(output => output.metadata()))
        .then(subMeta => ActorQueryOperationUnion
          .unionMetadata(subMeta, true, context, this.mediatorRdfMetadataAccumulate));
      return { type: 'bindings', bindingsStream, metadata };
    }

    // Handle quads
    if (outputType === 'quads') {
      const outputs: IQueryOperationResultQuads[] = outputsRaw.map(getSafeQuads);

      const quadStream = new UnionIterator(outputs.map(
        (output: IQueryOperationResultQuads) => output.quadStream,
      ), { autoStart: false });

      const metadata: () => Promise<MetadataQuads> = () => Promise.all(outputs.map(output => output.metadata()))
        .then(subMeta => ActorQueryOperationUnion
          .unionMetadata(subMeta, false, context, this.mediatorRdfMetadataAccumulate));
      return { type: 'quads', quadStream, metadata };
    }

    // Throw otherwise
    throw new Error(`Unable to union ${outputType}`);
  }
}

export interface IActorQueryOperationUnionArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
}
