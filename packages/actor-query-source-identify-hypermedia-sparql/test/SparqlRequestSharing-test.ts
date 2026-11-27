import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { SparqlRequestSharing } from '../lib/SparqlRequestSharing';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

function bindings(count: number): RDF.Bindings[] {
  return Array.from({ length: count }, (_, i) => BF.bindings([[ DF.variable('a'), DF.literal(`${i}`) ]]));
}

class ControlledIterator extends BufferedIterator<RDF.Bindings> {
  public constructor() {
    super({ autoStart: false });
  }

  public pushBindings(item: RDF.Bindings): void {
    this._push(item);
  }

  public override _read(_count: number, done: () => void): void {
    done();
  }
}

describe('SparqlRequestSharing', () => {
  const scope = {};
  let sharing: SparqlRequestSharing;

  beforeEach(() => {
    sharing = new SparqlRequestSharing(10);
  });

  describe('shareValue', () => {
    it('should share in-flight requests of the same scope and key', async() => {
      const send = jest.fn(async() => 3);
      await expect(Promise.all([
        sharing.shareValue(scope, 'k', send),
        sharing.shareValue(scope, 'k', send),
      ])).resolves.toEqual([ 3, 3 ]);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('should not keep values of completed requests', async() => {
      const send = jest.fn(async() => 3);
      await sharing.shareValue(scope, 'k', send);
      await sharing.shareValue(scope, 'k', send);
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should not share requests of different scopes or keys, or without scope', async() => {
      const send = jest.fn(async() => 3);
      await Promise.all([
        sharing.shareValue(scope, 'k', send),
        sharing.shareValue({}, 'k', send),
        sharing.shareValue(scope, 'l', send),
        sharing.shareValue(undefined, 'k', send),
      ]);
      expect(send).toHaveBeenCalledTimes(4);
    });

    it('should not share requests if disabled', async() => {
      sharing = new SparqlRequestSharing(0);
      const send = jest.fn(async() => 3);
      await Promise.all([ sharing.shareValue(scope, 'k', send), sharing.shareValue(scope, 'k', send) ]);
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should share rejections', async() => {
      const send = jest.fn(async() => {
        throw new Error('fail');
      });
      const results = await Promise.allSettled([
        sharing.shareValue(scope, 'k', send),
        sharing.shareValue(scope, 'k', send),
      ]);
      expect(results.map(result => result.status)).toEqual([ 'rejected', 'rejected' ]);
      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe('shareBindings', () => {
    it('should give all bindings to consumers of an in-flight request', async() => {
      const send = jest.fn(async() => new ArrayIterator(bindings(3), { autoStart: false }));
      const [ first, second ] = await Promise.all([
        sharing.shareBindings(scope, 'k', send),
        sharing.shareBindings(scope, 'k', send),
      ]);
      await expect(first.toArray()).resolves.toHaveLength(3);
      await expect(second.toArray()).resolves.toHaveLength(3);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('should replay earlier bindings to consumers that join later', async() => {
      const source = new ControlledIterator();
      const send = jest.fn(async() => source);
      const first = await sharing.shareBindings(scope, 'k', send);
      const [ b0, b1 ] = bindings(2);
      source.pushBindings(b0);
      await new Promise(setImmediate);
      const second = await sharing.shareBindings(scope, 'k', send);
      source.pushBindings(b1);
      source.close();
      await expect(first.toArray()).resolves.toEqual([ b0, b1 ]);
      await expect(second.toArray()).resolves.toEqual([ b0, b1 ]);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('should read bindings regardless of whether consumers read them', async() => {
      const send = jest.fn(async() => new ArrayIterator(bindings(3), { autoStart: false }));
      const first = await sharing.shareBindings(scope, 'k', send);
      const second = await sharing.shareBindings(scope, 'k', send);
      // The second consumer is read completely before the first, which would deadlock with lazy sharing.
      await expect(second.toArray()).resolves.toHaveLength(3);
      await expect(first.toArray()).resolves.toHaveLength(3);
    });

    it('should not share requests after they completed', async() => {
      const send = jest.fn(async() => new ArrayIterator(bindings(3), { autoStart: false }));
      await (await sharing.shareBindings(scope, 'k', send)).toArray();
      await expect((await sharing.shareBindings(scope, 'k', send)).toArray()).resolves.toHaveLength(3);
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('should give completed bindings to consumers that join before completion is noticed', async() => {
      const source = new ControlledIterator();
      const send = jest.fn(async() => source);
      const first = await sharing.shareBindings(scope, 'k', send);
      const shared = (<any> sharing).scopes.get(scope).get('k').bindings;
      source.pushBindings(bindings(1)[0]);
      source.close();
      await expect(first.toArray()).resolves.toHaveLength(1);
      await expect(shared.subscribe().toArray()).resolves.toHaveLength(1);
    });

    it('should not share requests with more bindings than the maximum with later consumers', async() => {
      sharing = new SparqlRequestSharing(2);
      const source = new ControlledIterator();
      const send = jest.fn(async() => source);
      const first = await sharing.shareBindings(scope, 'k', send);
      const second = await sharing.shareBindings(scope, 'k', send);
      for (const item of bindings(3)) {
        source.pushBindings(item);
      }
      await new Promise(setImmediate);
      const other = new ArrayIterator(bindings(3), { autoStart: false });
      const third = await sharing.shareBindings(scope, 'k', async() => other);
      source.close();
      await expect(first.toArray()).resolves.toHaveLength(3);
      await expect(second.toArray()).resolves.toHaveLength(3);
      await expect(third.toArray()).resolves.toHaveLength(3);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('should pass errors to all consumers', async() => {
      const source = new ControlledIterator();
      const first = await sharing.shareBindings(scope, 'k', async() => source);
      const second = await sharing.shareBindings(scope, 'k', async() => source);
      await new Promise(setImmediate);
      source.destroy(new Error('fail'));
      await expect(first.toArray()).rejects.toThrow('fail');
      await expect(second.toArray()).rejects.toThrow('fail');
    });

    it('should pass errors of sending to all consumers', async() => {
      const send = jest.fn(async() => {
        throw new Error('fail');
      });
      const first = await sharing.shareBindings(scope, 'k', send);
      const second = await sharing.shareBindings(scope, 'k', send);
      await expect(first.toArray()).rejects.toThrow('fail');
      await expect(second.toArray()).rejects.toThrow('fail');
    });

    it('should stop the request once all consumers stopped reading', async() => {
      const source = new ControlledIterator();
      const first = await sharing.shareBindings(scope, 'k', async() => source);
      const second = await sharing.shareBindings(scope, 'k', async() => source);
      await new Promise(setImmediate);
      first.destroy();
      expect(source.destroyed).toBe(false);
      second.destroy();
      expect(source.destroyed).toBe(true);
      const third = await sharing
        .shareBindings(scope, 'k', async() => new ArrayIterator(bindings(1), { autoStart: false }));
      await expect(third.toArray()).resolves.toHaveLength(1);
    });

    it('should stop the request if all consumers stopped reading before it was sent', async() => {
      const source = new ControlledIterator();
      const first = await sharing.shareBindings(scope, 'k', async() => {
        await new Promise(setImmediate);
        return source;
      });
      first.destroy();
      await new Promise(setImmediate);
      await new Promise(setImmediate);
      expect(source.destroyed).toBe(true);
    });

    it('should ignore errors after the request was stopped', async() => {
      const source = new ControlledIterator();
      const first = await sharing.shareBindings(scope, 'k', async() => source);
      await new Promise(setImmediate);
      first.destroy();
      expect(() => source.emit('error', new Error('late'))).not.toThrow();
    });

    it('should not share requests without scope', async() => {
      const send = jest.fn(async() => new ArrayIterator(bindings(1), { autoStart: false }));
      await Promise.all([ sharing.shareBindings(undefined, 'k', send), sharing.shareBindings(undefined, 'k', send) ]);
      expect(send).toHaveBeenCalledTimes(2);
    });
  });
});
