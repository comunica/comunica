import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliArgsHandlerMemory, getFilePaths, loadStore } from '../lib/performanceEndpointMemory';

describe('loadStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'performance-endpoint-memory-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads files into a single store', async() => {
    const triples = join(dir, 'dataset.nt');
    writeFileSync(triples, '<ex:s1> <ex:p> <ex:o1> .\n<ex:s2> <ex:p> <ex:o2> .\n');
    const turtle = join(dir, 'dataset.ttl');
    writeFileSync(turtle, '@prefix ex: <http://example.org/> .\nex:s3 ex:p ex:o3 , ex:o4 .\n');

    const store = await loadStore([ triples, turtle ]);

    expect(store.size).toBe(4);
  });

  it('loads no files into an empty store', async() => {
    const store = await loadStore([]);

    expect(store.size).toBe(0);
  });

  it('rejects on a missing file', async() => {
    await expect(loadStore([ join(dir, 'missing.nt') ])).rejects.toThrow('ENOENT');
  });

  it('rejects on an invalid file', async() => {
    const file = join(dir, 'invalid.nt');
    writeFileSync(file, '<ex:s> <ex:p> .\n');

    await expect(loadStore([ file ])).rejects.toThrow('Expected entity but got .');
  });
});

describe('getFilePaths', () => {
  it('determines the paths of file sources', () => {
    expect(getFilePaths([
      'a.nt',
      { type: 'file', value: 'b.nt' },
      { value: 'c.nt' },
    ])).toEqual([ 'a.nt', 'b.nt', 'c.nt' ]);
  });

  it('throws on sources of another type', () => {
    expect(() => getFilePaths([{ type: 'sparql', value: 'http://example.org/sparql' }]))
      .toThrow('The in-memory endpoint only supports local files as sources, but received {"type":"sparql","value":"http://example.org/sparql"}');
  });

  it('throws on sources that are not identified by a path', () => {
    expect(() => getFilePaths([{ type: 'file', value: {}}]))
      .toThrow('The in-memory endpoint only supports local files as sources, but received {"type":"file","value":{}}');
  });
});

describe('CliArgsHandlerMemory', () => {
  let forkListener: ((worker: { process: { kill: () => void }}) => void) | undefined;
  let cluster: { isPrimary: boolean; on: jest.Mock };
  let stderr: { write: jest.Mock };
  let exit: jest.Mock;
  let handler: CliArgsHandlerMemory;

  beforeEach(() => {
    forkListener = undefined;
    cluster = {
      isPrimary: true,
      on: jest.fn((event, listener) => {
        forkListener = listener;
      }),
    };
    stderr = { write: jest.fn() };
    exit = jest.fn();
    handler = new CliArgsHandlerMemory(cluster, stderr, exit);
  });

  describe('populateYargs', () => {
    let check: (args: Record<string, any>) => boolean;

    let argumentsBuilder: any;

    beforeEach(() => {
      argumentsBuilder = {
        check: jest.fn((checkFunction) => {
          check = checkFunction;
          return argumentsBuilder;
        }),
      };
    });

    it('returns the arguments builder', () => {
      expect(handler.populateYargs(argumentsBuilder)).toBe(argumentsBuilder);
    });

    it('accepts a single worker', () => {
      handler.populateYargs(argumentsBuilder);
      expect(check({ workers: 1, freshWorker: false })).toBe(true);
    });

    it('rejects multiple workers', () => {
      handler.populateYargs(argumentsBuilder);
      expect(() => check({ workers: 2 }))
        .toThrow('The in-memory endpoint only supports a single worker, as each worker has its own copy of the data');
    });

    it('rejects fresh workers', () => {
      handler.populateYargs(argumentsBuilder);
      expect(() => check({ workers: 1, freshWorker: true }))
        .toThrow('The in-memory endpoint does not support fresh workers, as each worker reloads the data');
    });
  });

  describe('handleArgs', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'performance-endpoint-memory-test-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('loads the sources into a store in a worker', async() => {
      cluster.isPrimary = false;
      const file = join(dir, 'dataset.nt');
      writeFileSync(file, '<ex:s> <ex:p> <ex:o> .\n');
      const context: Record<string, any> = { sources: [{ type: 'file', value: file }]};

      await handler.handleArgs({}, context);

      expect(context.sources).toHaveLength(1);
      expect(context.sources[0].size).toBe(1);
      expect(cluster.on).not.toHaveBeenCalled();
    });

    it('does not load the sources in the primary process', async() => {
      const context: Record<string, any> = { sources: [{ type: 'file', value: join(dir, 'missing.nt') }]};

      await handler.handleArgs({}, context);

      expect(context.sources).toEqual([{ type: 'file', value: join(dir, 'missing.nt') }]);
      expect(cluster.on).toHaveBeenCalledWith('fork', expect.any(Function));
    });

    it('stops the endpoint when the worker restarts in the primary process', async() => {
      await handler.handleArgs({}, { sources: []});
      const firstWorker = { process: { kill: jest.fn() }};
      const secondWorker = { process: { kill: jest.fn() }};

      forkListener!(firstWorker);
      expect(exit).not.toHaveBeenCalled();
      expect(stderr.write).not.toHaveBeenCalled();

      forkListener!(secondWorker);
      expect(firstWorker.process.kill).not.toHaveBeenCalled();
      expect(secondWorker.process.kill).toHaveBeenCalledWith();
      expect(stderr.write).toHaveBeenCalledWith(
        'The in-memory endpoint stops, as restarting its worker after a timeout or crash would revert all updates.\n',
      );
      expect(exit).toHaveBeenCalledWith(1);
    });
  });
});
