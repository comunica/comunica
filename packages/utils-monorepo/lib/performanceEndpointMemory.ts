// eslint-disable-next-line import/no-nodejs-modules
import { createReadStream } from 'node:fs';
import { StreamParser } from 'n3';
import { RdfStore } from 'rdf-stores';

/**
 * The parts of a yargs arguments builder that are used here.
 */
export interface IArgumentsBuilder {
  check: (check: (args: Record<string, any>) => boolean) => IArgumentsBuilder;
}

/**
 * The parts of a Node.js cluster that are used here.
 */
export interface IClusterLike {
  isPrimary: boolean;
  on: (event: 'fork', listener: (worker: { process: { kill: () => void }}) => void) => void;
}

/**
 * Load RDF files into an in-memory store,
 * which is ordered just like the stores that file sources are loaded into by default.
 * @param files The paths of N-Triples, N-Quads, Turtle or TriG files.
 */
export async function loadStore(files: string[]): Promise<RdfStore<number>> {
  const store = RdfStore.createOrdered({ nodes: true });
  for (const file of files) {
    await new Promise<void>((resolve, reject) => {
      const input = createReadStream(file).on('error', reject);
      const parser = new StreamParser().on('error', reject);
      store.import(input.pipe(parser)).on('end', resolve);
    });
  }
  return store;
}

/**
 * Determine the paths of the local files that the given query sources refer to.
 * @param sources The query sources from the CLI arguments or context.
 */
export function getFilePaths(sources: (string | { type?: string; value: unknown })[]): string[] {
  return sources.map((source) => {
    if (typeof source === 'string') {
      return source;
    }
    if ((source.type === undefined || source.type === 'file') && typeof source.value === 'string') {
      return source.value;
    }
    throw new Error(`The in-memory endpoint only supports local files as sources, but received ${JSON.stringify(source)}`);
  });
}

/**
 * Handles the CLI arguments of a SPARQL endpoint over an in-memory copy of local RDF files,
 * which can be updated, unlike the files themselves.
 *
 * Every worker has its own copy, which is reloaded from the files when the worker restarts after a timeout,
 * which would revert all updates.
 * So only a single worker is allowed, and the endpoint stops instead of restarting it.
 */
export class CliArgsHandlerMemory {
  public constructor(
    private readonly cluster: IClusterLike,
    private readonly stderr: { write: (message: string) => void },
    private readonly exit: (code: number) => void,
  ) {}

  public populateYargs(argumentsBuilder: IArgumentsBuilder): IArgumentsBuilder {
    return argumentsBuilder.check((args) => {
      if (args.workers !== 1) {
        throw new Error(
          'The in-memory endpoint only supports a single worker, as each worker has its own copy of the data',
        );
      }
      if (args.freshWorker) {
        throw new Error('The in-memory endpoint does not support fresh workers, as each worker reloads the data');
      }
      return true;
    });
  }

  public async handleArgs(_args: Record<string, any>, context: Record<string, any>): Promise<void> {
    if (this.cluster.isPrimary) {
      this.stopOnWorkerRestart();
      return;
    }
    context.sources = [ await loadStore(getFilePaths(context.sources)) ];
  }

  /**
   * Stop the endpoint when its worker is restarted, as this would revert all updates.
   */
  public stopOnWorkerRestart(): void {
    let forks = 0;
    this.cluster.on('fork', (worker) => {
      forks++;
      if (forks > 1) {
        this.stderr.write(
          'The in-memory endpoint stops, as restarting its worker after a timeout or crash would revert all updates.\n',
        );
        worker.process.kill();
        this.exit(1);
      }
    });
  }
}
