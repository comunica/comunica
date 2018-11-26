import {ISearchForm} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";

/**
 * A comunica actor for rdf-resolve-hypermedia bus.
 *
 * Actor types:
 * * Input:  IActionRdfResolveHypermedia:      The metadata.
 * * Test:   <none>
 * * Output: IActorRdfResolveHypermediaOutput: The SearchForm resulting from the metadata.
 *
 * @see IActionRdfResolveQuadPattern
 * @see IActorRdfResolveQuadPatternOutput
 */
export abstract class ActorRdfResolveHypermedia extends Actor<IActionRdfResolveHypermedia, IActorTest,
  IActorRdfResolveHypermediaOutput> {

  constructor(args: IActorArgs<IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>) {
    super(args);
  }

}

export interface IActionRdfResolveHypermedia extends IAction {
  metadata?: {[id: string]: any};
}

export interface IActorRdfResolveHypermediaOutput extends IActorOutput {
  searchForm: ISearchForm;
}
