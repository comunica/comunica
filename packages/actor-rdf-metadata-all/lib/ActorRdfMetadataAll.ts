import { Readable } from 'stream';
import type { IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import { ActorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica All RDF Metadata Actor.
 */
export class ActorRdfMetadataAll extends ActorRdfMetadata {
  public constructor(args: IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadata): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadata): Promise<IActorRdfMetadataOutput> {
    const data: Readable = new Readable({ objectMode: true });
    const metadata: Readable = new Readable({ objectMode: true });

    // Delay attachment of listeners until the data or metadata stream is being read.
    const attachListeners = (): void => {
      // Attach listeners only once
      data._read = metadata._read = () => {
        // Do nothing
      };

      // Forward errors
      action.quads.on('error', error => {
        data.emit('error', error);
        metadata.emit('error', error);
      });

      // Forward quads to both streams
      action.quads.on('data', quad => {
        data.push(quad);
        metadata.push(quad);
      });

      // Terminate both streams on-end
      action.quads.on('end', () => {
        data.push(null);
        metadata.push(null);
      });
    };
    data._read = metadata._read = () => {
      attachListeners();
    };

    return { data, metadata };
  }
}
