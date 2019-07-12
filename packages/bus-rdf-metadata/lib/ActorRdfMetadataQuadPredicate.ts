import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {ActorRdfMetadata, IActionRdfMetadata, IActorRdfMetadataOutput} from "./ActorRdfMetadata";

/**
 * An abstract implementation of {@link ActorRdfMetadata} that
 * only requires the quad test {@link ActorRdfMetadata#isMetadata} method to be overridden.
 */
export abstract class ActorRdfMetadataQuadPredicate extends ActorRdfMetadata {

  constructor(args: IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>) {
    super(args);
  }

  /**
   * If the given quad should be sent to the metadata stream.
   * Otherwise, it will be sent to the data stream.
   * @param {RDF.Quad} quad A quad.
   * @param pageUrl         The page URL from which the quads were retrieved.
   * @param context         An object that is shared across all invocations in a single action.
   *                        This can be used to maintain a state inside a single stream.
   * @return {boolean}      If the given quad is a metadata quad.
   */
  public abstract isMetadata(quad: RDF.Quad, pageUrl: string, context: any): boolean;

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

      const context = {};
      action.quads.on('data', (quad) => {
        if (this.isMetadata(quad, action.url, context)) {
          metadata.push(quad);
        } else {
          data.push(quad);
        }
      });

      action.quads.on('end', () => {
        data.push(null);
        metadata.push(null);
      });
    };
    data._read = metadata._read = () => { attachListeners(); };

    return { data, metadata };
  }

}
