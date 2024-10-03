import type { IActionRdfMetadata, IActorRdfMetadataArgs, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import { ActorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { Readable } from 'readable-stream';

/**
 * A comunica All RDF Metadata Actor.
 */
export class ActorRdfMetadataAll extends ActorRdfMetadata {
  public constructor(args: IActorRdfMetadataArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadata): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadata): Promise<IActorRdfMetadataOutput> {
    const data: Readable = new Readable({ objectMode: true });
    const metadata: Readable = new Readable({ objectMode: true });

    // Forward errors (attach them immediately as they could arrive earlier)
    action.quads.on('error', (error) => {
      data.emit('error', error);
      metadata.emit('error', error);
    });

    // Terminate both streams on-end
    action.quads.on('end', () => {
      data.push(null);
      metadata.push(null);
    });

    const read: (size: number) => void = data._read = metadata._read = (size) => {
      while (size > 0) {
        const item = action.quads.read();
        if (item === null) {
          return action.quads.once('readable', () => read(size));
        }
        size--;
        data.push(item);
        metadata.push(item);
      }
    };

    return { data, metadata };
  }
}
