import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { BindingsStream } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getMetadataBindings, MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { QuerySourceServiceExecutor } from '../lib/QuerySourceServiceExecutor';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function createServiceOperation(silent = false): ReturnType<typeof AF.createService> {
  return AF.createService(
    AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o')),
    DF.namedNode('urn:service'),
    silent,
  );
}

function createMaterializedInput(): ReturnType<typeof AF.createPattern> {
  return AF.createPattern(DF.namedNode('urn:s'), DF.namedNode('p'), DF.variable('o'));
}

function collectBindings(bindingsStream: BindingsStream): Promise<RDF.Bindings[]> {
  return new Promise((resolve, reject) => {
    const bindings: RDF.Bindings[] = [];
    bindingsStream.on('data', binding => bindings.push(binding));
    bindingsStream.on('end', () => resolve(bindings));
    bindingsStream.on('error', reject);
  });
}

function createExecutorBindings(
  events: (
    | { type: 'data'; binding: RDF.Bindings }
    | { type: 'error'; error: Error }
    | { type: 'end' }
  )[],
  metadata?: Record<string, any>,
): BindingsStream {
  const iterator = new class extends BufferedIterator<RDF.Bindings> {
    private readonly events = events;

    public constructor() {
      super({ autoStart: false });
      if (metadata) {
        this.setProperty('metadata', metadata);
      }
    }

    public override _read(_count: number, done: () => void): void {
      for (const event of this.events) {
        if (event.type === 'data') {
          this._push(event.binding);
        } else if (event.type === 'error') {
          this.emit('error', event.error);
        } else {
          this.close();
        }
      }
      done();
    }
  }();
  return iterator;
}

describe('QuerySourceServiceExecutor', () => {
  it('should expose source capabilities and reject non-bindings query methods', async() => {
    const source = new QuerySourceServiceExecutor('urn:service', jest.fn());

    await expect(source.getFilterFactor(new ActionContext())).resolves.toBe(1);
    await expect(source.getSelectorShape(new ActionContext())).resolves.toEqual({
      type: 'operation',
      operation: {
        operationType: 'wildcard',
      },
    });
    expect(source.toString()).toBe('QuerySourceServiceExecutor(urn:service)');
    expect(() => source.queryQuads(AF.createNop(), new ActionContext()))
      .toThrow('Custom SERVICE executors can only produce bindings results.');
    await expect(source.queryBoolean(AF.createAsk(AF.createBgp([])), new ActionContext()))
      .rejects.toThrow('Custom SERVICE executors can only produce bindings results.');
    await expect(source.queryVoid(AF.createNop(), new ActionContext()))
      .rejects.toThrow('Custom SERVICE executors can only produce bindings results.');
  });

  it('should call the executor with the active SERVICE operation and current binding', async() => {
    const serviceOperation = createServiceOperation();
    const materializedInput = createMaterializedInput();
    const joinBindings = BF.bindings([[ DF.variable('s'), DF.namedNode('urn:s') ]]);
    const executorBindings = new ArrayIterator([
      BF.bindings([
        [ DF.variable('o'), DF.literal('result') ],
      ]),
    ], { autoStart: false });
    const metadata = {
      cardinality: { type: 'exact', value: 1 },
      variables: [
        { variable: DF.variable('o'), canBeUndef: false },
      ],
    };
    executorBindings.setProperty('metadata', metadata);

    const serviceExecutor = <any> jest.fn(async() => executorBindings);
    const source = new QuerySourceServiceExecutor('urn:service', serviceExecutor);
    const context = new ActionContext()
      .set(KeysQueryOperation.serviceOperation, serviceOperation)
      .set(KeysQueryOperation.joinBindings, joinBindings);

    const bindingsStream = source.queryBindings(materializedInput, context);

    await expect(bindingsStream).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('o'), DF.literal('result') ],
      ]),
    ]);
    await expect(getMetadataBindings(bindingsStream)()).resolves.toEqual(expect.objectContaining(metadata));

    expect(serviceExecutor).toHaveBeenCalledTimes(1);
    expect(serviceExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        ...serviceOperation,
        input: materializedInput,
      }),
      joinBindings,
      context,
      undefined,
    );
  });

  it('should preserve the incoming binding for a silent SERVICE when the executor throws', async() => {
    const serviceOperation = createServiceOperation(true);
    const materializedInput = createMaterializedInput();
    const joinBindings = BF.bindings([[ DF.variable('s'), DF.namedNode('urn:s') ]]);

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => {
      throw new Error('service failed');
    }));
    const context = new ActionContext()
      .set(KeysInitQuery.dataFactory, DF)
      .set(KeysInitQuery.lenient, true)
      .set(KeysQueryOperation.serviceOperation, serviceOperation)
      .set(KeysQueryOperation.joinBindings, joinBindings);

    const bindingsStream = source.queryBindings(materializedInput, context);

    await expect(bindingsStream).toEqualBindingsStream([
      joinBindings,
    ]);
    await expect(getMetadataBindings(bindingsStream)()).resolves.toEqual(expect.objectContaining({
      cardinality: { type: 'exact', value: 1 },
      variables: [
        { variable: DF.variable('s'), canBeUndef: false },
      ],
    }));
  });

  it('should preserve emitted bindings for a silent SERVICE when the executor stream errors afterwards', async() => {
    const serviceOperation = createServiceOperation(true);
    const materializedInput = createMaterializedInput();
    const state = new MetadataValidationState();
    const metadata = {
      state,
      cardinality: { type: 'exact', value: 1 },
      variables: [
        { variable: DF.variable('o'), canBeUndef: false },
      ],
    };
    const resultBinding = BF.bindings([
      [ DF.variable('o'), DF.literal('result') ],
    ]);
    const executorBindings = new class extends BufferedIterator<RDF.Bindings> {
      private started = false;

      public constructor() {
        super({ autoStart: false });
        this.setProperty('metadata', metadata);
      }

      public override _read(_count: number, done: () => void): void {
        if (this.started) {
          done();
          return;
        }
        this.started = true;
        this._push(resultBinding);
        setImmediate(() => {
          this.emit('error', new Error('service failed'));
          this.close();
        });
        done();
      }
    }();

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => executorBindings));
    const context = new ActionContext()
      .set(KeysInitQuery.dataFactory, DF)
      .set(KeysInitQuery.lenient, true)
      .set(KeysQueryOperation.serviceOperation, serviceOperation);

    const bindingsStream = source.queryBindings(materializedInput, context);

    await expect(bindingsStream).toEqualBindingsStream([
      resultBinding,
    ]);
    await expect(getMetadataBindings(bindingsStream)()).resolves.toEqual(metadata);
  });

  it('should fallback only once for repeated silent SERVICE stream errors', async() => {
    const serviceOperation = createServiceOperation(true);
    const materializedInput = createMaterializedInput();
    const executorBindings = new class extends BufferedIterator<RDF.Bindings> {
      private started = false;

      public constructor() {
        super({ autoStart: false });
      }

      public override _read(_count: number, done: () => void): void {
        if (this.started) {
          done();
          return;
        }
        this.started = true;
        setImmediate(() => {
          this.emit('error', new Error('service failed'));
          setImmediate(() => {
            this.emit('error', new Error('service failed again'));
            this.close();
          });
        });
        done();
      }
    }();

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => executorBindings));
    const context = new ActionContext()
      .set(KeysInitQuery.dataFactory, DF)
      .set(KeysInitQuery.lenient, true)
      .set(KeysQueryOperation.serviceOperation, serviceOperation);

    const bindingsStream = source.queryBindings(materializedInput, context);

    await expect(bindingsStream).toEqualBindingsStream([
      BF.bindings(),
    ]);
    await expect(getMetadataBindings(bindingsStream)()).resolves.toEqual(expect.objectContaining({
      cardinality: { type: 'exact', value: 1 },
      variables: [],
    }));
  });

  it('should ignore duplicate silent fallback emissions', async() => {
    const serviceOperation = createServiceOperation(true);
    const materializedInput = createMaterializedInput();
    const executorBindings = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
    executorBindings.setProperty('metadata', {
      cardinality: { type: 'exact', value: 0 },
      variables: [],
    });

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => executorBindings));
    const context = new ActionContext()
      .set(KeysInitQuery.dataFactory, DF)
      .set(KeysInitQuery.lenient, true)
      .set(KeysQueryOperation.serviceOperation, serviceOperation);
    const bindingsStream = <any> source.queryBindings(materializedInput, context);

    bindingsStream.emitSilentFallback();
    bindingsStream.emitSilentFallback();

    await expect(bindingsStream).toEqualBindingsStream([
      BF.bindings(),
    ]);
  });

  it('should error when the executor stream errors for a non-silent SERVICE', async() => {
    const serviceOperation = createServiceOperation();
    const materializedInput = createMaterializedInput();
    const executorBindings = createExecutorBindings([
      { type: 'error', error: new Error('service failed') },
    ]);

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => executorBindings));
    const context = new ActionContext()
      .set(KeysQueryOperation.serviceOperation, serviceOperation);

    const bindingsStream = source.queryBindings(materializedInput, context);
    const metadataPromise = getMetadataBindings(bindingsStream)();

    await expect(collectBindings(bindingsStream)).rejects.toThrow('service failed');
    await expect(metadataPromise).rejects.toThrow('service failed');
  });

  it('should error when the executor promise rejects for a non-silent SERVICE', async() => {
    const serviceOperation = createServiceOperation();
    const materializedInput = createMaterializedInput();

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => {
      throw new Error('service failed');
    }));
    const context = new ActionContext()
      .set(KeysQueryOperation.serviceOperation, serviceOperation);

    const bindingsStream = source.queryBindings(materializedInput, context);
    const metadataPromise = getMetadataBindings(bindingsStream)();

    await expect(collectBindings(bindingsStream)).rejects.toThrow('service failed');
    await expect(metadataPromise).rejects.toThrow('service failed');
  });

  it('should ignore repeated reads after the first start', async() => {
    const serviceOperation = createServiceOperation();
    const materializedInput = createMaterializedInput();
    const executorBindings = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
    executorBindings.setProperty('metadata', {
      cardinality: { type: 'exact', value: 0 },
      variables: [],
    });

    const source = new QuerySourceServiceExecutor('urn:service', jest.fn(async() => executorBindings));
    const context = new ActionContext()
      .set(KeysQueryOperation.serviceOperation, serviceOperation);
    const bindingsStream = <any> source.queryBindings(materializedInput, context);
    const firstDone = jest.fn();
    const secondDone = jest.fn();

    bindingsStream._read(0, firstDone);
    bindingsStream._read(0, secondDone);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(firstDone).toHaveBeenCalledTimes(1);
    expect(secondDone).toHaveBeenCalledTimes(1);
  });
});
