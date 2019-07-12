import {ActorRdfMetadata, IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * An RDF Metadata Actor that splits off the metadata based on the existence of a 'foaf:primaryTopic' link.
 * Only non-triple quad streams are supported.
 */
export class ActorRdfMetadataPrimaryTopic extends ActorRdfMetadata {

  private readonly metadataToData: boolean;
  private readonly dataToMetadataOnInvalidMetadataGraph: boolean;

  constructor(args: IActorRdfMetadataPrimaryTopicArgs) {
    super(args);
  }

  public async test(action: IActionRdfMetadata): Promise<IActorTest> {
    if (action.triples) {
      throw new Error('This actor only supports non-triple quad streams.');
    }
    return true;
  }

  public async run(action: IActionRdfMetadata): Promise<IActorRdfMetadataOutput> {
    const data: Readable = new Readable({ objectMode: true });
    const metadata: Readable = new Readable({ objectMode: true });

    // Delay attachment of listeners until the data or metadata stream is being read.
    const attachListeners = () => {
      // Attach listeners only once
      data._read = metadata._read = () => { return; };

      // Forward errors
      action.quads.on('error', (error) => {
        data.emit('error', error);
        metadata.emit('error', error);
      });

      // First pass over data to categorize in graphs,
      // and to detect the primaryTopic triple.
      const graphs: {[id: string]: RDF.Quad[]} = {};
      let endpointIdentifier: string = null;
      const primaryTopics: {[id: string]: string} = {};
      action.quads.on('data', (quad) => {
        if (quad.predicate.value === 'http://rdfs.org/ns/void#subset'
          && quad.object.value === action.url) {
          endpointIdentifier = quad.subject.value;
        } else if (quad.predicate.value === 'http://xmlns.com/foaf/0.1/primaryTopic') {
          primaryTopics[quad.object.value] = quad.subject.value;
        }
        let quads: RDF.Quad[] = graphs[quad.graph.value];
        if (!quads) {
          quads = graphs[quad.graph.value] = [];
        }
        quads.push(quad);
      });

      // When the stream has finished,
      // determine the appropriate metadata graph,
      // and emit all quads to the appropriate streams.
      action.quads.on('end', () => {
        const metadataGraph: string = endpointIdentifier ? primaryTopics[endpointIdentifier] : null;
        for (const graphName in graphs) {
          if (graphName === metadataGraph) {
            for (const quad of graphs[graphName]) {
              metadata.push(quad);
            }
            // Also emit metadata to data if requested
            if (this.metadataToData) {
              for (const quad of graphs[graphName]) {
                data.push(quad);
              }
            }
          } else {
            for (const quad of graphs[graphName]) {
              data.push(quad);
            }
            if (!metadataGraph && this.dataToMetadataOnInvalidMetadataGraph) {
              for (const quad of graphs[graphName]) {
                metadata.push(quad);
              }
            }
          }
        }
        data.push(null);
        metadata.push(null);
      });
    };
    data._read = metadata._read = () => { attachListeners(); };

    return { data, metadata };
  }

}

export interface IActorRdfMetadataPrimaryTopicArgs
  extends IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput> {
  metadataToData: boolean;
  dataToMetadataOnInvalidMetadataGraph: boolean;
}
