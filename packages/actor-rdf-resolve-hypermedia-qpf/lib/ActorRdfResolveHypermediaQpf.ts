import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {
  ActorRdfResolveHypermedia,
  IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput,
  IActorRdfResolveHypermediaTest,
} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {RdfSourceQpf} from "./RdfSourceQpf";

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveHypermediaQpf extends ActorRdfResolveHypermedia
implements IActorRdfResolveHypermediaQpfArgs {

  public readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  public readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;

  constructor(args: IActorRdfResolveHypermediaQpfArgs) {
    super(args, 'qpf');
  }

  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    const searchForm = this.createSource(action.metadata, action.context, null).searchForm;
    if (!searchForm) {
      throw new Error(`Actor ${this.name} could not detect a TPF/QPF search form.`);
    }
    if (action.handledDatasets && action.handledDatasets[searchForm.dataset]) {
      throw new Error(`Actor ${this.name} can only be applied for the first page of a QPF dataset.`);
    }
    return { filterFactor: 1 };
  }

  /**
   * Look for the search form
   * @param {IActionRdfResolveHypermedia} the metadata to look for the form.
   * @return {Promise<IActorRdfResolveHypermediaOutput>} A promise resolving to a hypermedia form.
   */
  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as qpf source: ${action.url}`);
    const source = this.createSource(action.metadata, action.context, action.quads);
    return { source, dataset: source.searchForm.dataset };
  }

  protected createSource(metadata: {[id: string]: any}, context: ActionContext, quads: RDF.Stream): RdfSourceQpf {
    return new RdfSourceQpf(this.mediatorMetadata, this.mediatorMetadataExtract, this.mediatorRdfDereference,
      this.subjectUri, this.predicateUri, this.objectUri, this.graphUri, metadata, context, quads);
  }
}

export interface IActorRdfResolveHypermediaQpfArgs extends
IActorArgs<IActionRdfResolveHypermedia, IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaOutput> {
  mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  subjectUri: string;
  predicateUri: string;
  objectUri: string;
  graphUri?: string;
}
