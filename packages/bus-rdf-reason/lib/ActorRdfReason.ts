import { KeysRdfUpdateQuads, KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor, ActionContext } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import type { IDatasetFactory, IReasonGroup } from '@comunica/reasoning-types';
import type { IActionContext, IDataDestination, IDataSource } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

export function implicitDatasetFactory(context: IActionContext): IDataSource & IDataDestination {
  const datasetFactory = context.get<IDatasetFactory>(KeysRdfReason.implicitDatasetFactory);
  if (!datasetFactory) {
    throw new Error(`Missing context entry for ${KeysRdfReason.implicitDatasetFactory.name}`);
  }
  return datasetFactory();
}

export function implicitGroupFactory(context: IActionContext): IReasonGroup {
  return {
    dataset: implicitDatasetFactory(context),
    status: { type: 'full', reasoned: false },
    context: new ActionContext(),
  };
}

// TODO: Clean up after https://github.com/comunica/comunica-feature-reasoning/issues/945 is closed
export function getSafeData(context: IActionContext): IReasonGroup {
  const data: IReasonGroup | undefined = context.get(KeysRdfReason.data);
  if (!data) {
    throw new Error(`Context entry ${KeysRdfReason.data.name} is required but not available`);
  }
  return data;
}

export function getImplicitSource(context: IActionContext): IDataSource & IDataDestination {
  return getSafeData(context).dataset;
}

export function getExplicitSources(context: IActionContext): IDataSource[] {
  return context.has(KeysRdfResolveQuadPattern.source) ?
    [ context.get(KeysRdfResolveQuadPattern.source)! ] :
    context.get(KeysRdfResolveQuadPattern.sources) ?? [];
}

export function getUnionSources(context: IActionContext): IDataSource[] {
  return [ ...getExplicitSources(context), getImplicitSource(context) ];
}

export function setImplicitDestination(context: IActionContext): IActionContext {
  return context.set(KeysRdfUpdateQuads.destination, getImplicitSource(context));
}

export function setImplicitSource(context: IActionContext): IActionContext {
  return context
    .delete(KeysRdfResolveQuadPattern.sources)
    .set(KeysRdfResolveQuadPattern.source, getImplicitSource(context));
}

export function setUnionSource(context: IActionContext): IActionContext {
  return context.delete(KeysRdfResolveQuadPattern.source)
    .set(KeysRdfResolveQuadPattern.sources, getUnionSources(context));
}

export function getContextWithImplicitDataset(context: IActionContext): IActionContext {
  // We cannot use 'setDefault' here because implicitGroupFactory will throw an error
  // if there is no implicit dataset factory *even if* we already have a data entry
  return context.has(KeysRdfReason.data) ? context : context.set(KeysRdfReason.data, implicitGroupFactory(context));
}

export function setReasoningStatus(context: IActionContext, status: IReasonGroup['status']): IActionContext {
  getSafeData(context).status = status;
  return context;
}

/**
 * A comunica actor for reasoning over RDF data
 *
 * Actor types:
 * * Input:  IActionRdfReason:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorRdfReasonOutput: TODO: fill in.
 *
 * @see IActionRdfReason
 * @see IActorRdfReasonOutput
 */
export abstract class ActorRdfReason extends Actor<IActionRdfReason, IActorTest, IActorRdfReasonOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfReasonArgs) {
    super(args);
  }
}

export interface IQuadUpdates {
  quadStreamInsert?: AsyncIterator<RDF.Quad>;
  quadStreamDelete?: AsyncIterator<RDF.Quad>;
}

export interface IActionRdfReason extends IAction {
  /**
   * The patterns for which must have all inferred data
   *
   * If left undefined then all inferences on the data need to be made
   */
  pattern?: Algebra.Pattern;
  /**
   *
   */
  updates?: IQuadUpdates;
}

export interface IActorRdfReasonOutput extends IActorOutput {
  /**
   * Async function that resolves when the reasoning is done.
   */
  execute: () => Promise<void>;
}

export type MediatorRdfReason = Mediate<IActionRdfReason, IActorRdfReasonOutput>;

export type IActorRdfReasonArgs = IActorArgs<IActionRdfReason, IActorTest, IActorRdfReasonOutput>;
