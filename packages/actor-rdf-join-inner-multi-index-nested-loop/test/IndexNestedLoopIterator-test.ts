import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import { ActionContext } from '@comunica/core';
import type { Bindings, IQuerySource } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import type { IIndexNestedLoopLookup } from '../lib/IndexNestedLoopIterator';
import { getArbitraryLengthPathLookup, IndexNestedLoopIterator } from '../lib/IndexNestedLoopIterator';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);

describe('IndexNestedLoopIterator', () => {
  // Answers patterns with a variable object from a fixed subject-predicate-object table.
  const table: Record<string, string[]> = {
    'ex:a ex:p': [ 'ex:b', 'ex:c' ],
    'ex:b ex:q': [ 'ex:d' ],
    'ex:c ex:q': [],
    'ex:d ex:r': [ 'ex:e' ],
  };
  function answer(operation: any): Bindings[] {
    return (table[`${operation.subject.value} ${operation.predicate.value}`] ?? [])
      .map(value => BF.bindings([[ operation.object, DF.namedNode(value) ]]));
  }
  const syncSource = <IQuerySource> <any> {
    queryBindingsSynchronous: jest.fn(answer),
    queryBindings: jest.fn(),
  };
  const asyncSource = <IQuerySource> <any> {
    queryBindingsSynchronous: jest.fn(() => undefined),
    queryBindings: jest.fn((operation: any) => new ArrayIterator(answer(operation), { autoStart: false })),
  };
  const streamOnlySource = <IQuerySource> <any> {
    queryBindings: jest.fn((operation: any) => new ArrayIterator(answer(operation), { autoStart: false })),
  };
  const context = <any> {};
  const lookup = (
    subject: string,
    predicate: string,
    object: string,
    source: IQuerySource,
    optional?: boolean,
  ): IIndexNestedLoopLookup => ({
    operation: AF.createPattern(
      subject.startsWith('?') ? DF.variable(subject.slice(1)) : DF.namedNode(subject),
      DF.namedNode(predicate),
      DF.variable(object.slice(1)),
    ),
    source,
    context,
    optional,
  });
  const input = (): AsyncIterator<Bindings> => new ArrayIterator<Bindings>([
    BF.bindings([[ DF.variable('x'), DF.namedNode('ex:a') ]]),
  ], { autoStart: false });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joins every input binding with consecutive lookups', async() => {
    const it = new IndexNestedLoopIterator(input(), [
      lookup('?x', 'ex:p', '?y', syncSource),
      lookup('?y', 'ex:q', '?z', syncSource),
    ], AF, BF);
    await expect(it).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:b') ],
        [ DF.variable('z'), DF.namedNode('ex:d') ],
      ]),
    ]);
    expect(syncSource.queryBindingsSynchronous).toHaveBeenCalledTimes(3);
    expect(syncSource.queryBindings).not.toHaveBeenCalled();
  });

  it('binds the variables of a looked up pattern', async() => {
    const it = new IndexNestedLoopIterator(input(), [ lookup('?x', 'ex:p', '?y', syncSource) ], AF, BF);
    await it.toArray();
    expect(syncSource.queryBindingsSynchronous).toHaveBeenCalledWith(
      AF.createPattern(DF.namedNode('ex:a'), DF.namedNode('ex:p'), DF.variable('y')),
      context,
    );
  });

  it('binds the variables of a looked up operation that is not a pattern', async() => {
    const source = <IQuerySource> <any> {
      queryBindingsSynchronous: jest.fn(() => [
        BF.bindings([
          [ DF.variable('y'), DF.namedNode('ex:b') ],
          [ DF.variable('z'), DF.namedNode('ex:d') ],
        ]),
      ]),
    };
    const operation = AF.createJoin([
      AF.createPattern(DF.variable('x'), DF.namedNode('ex:p'), DF.variable('y')),
      AF.createPattern(DF.variable('y'), DF.namedNode('ex:q'), DF.variable('z')),
    ]);
    const it = new IndexNestedLoopIterator(input(), [{ operation, source, context }], AF, BF);
    await expect(it).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:b') ],
        [ DF.variable('z'), DF.namedNode('ex:d') ],
      ]),
    ]);
    expect(source.queryBindingsSynchronous).toHaveBeenCalledWith(AF.createJoin([
      AF.createPattern(DF.namedNode('ex:a'), DF.namedNode('ex:p'), DF.variable('y')),
      AF.createPattern(DF.variable('y'), DF.namedNode('ex:q'), DF.variable('z')),
    ]), context);
  });

  it('falls back to the bindings stream when a synchronous lookup is not possible', async() => {
    const it = new IndexNestedLoopIterator(input(), [
      lookup('?x', 'ex:p', '?y', asyncSource),
      lookup('?y', 'ex:q', '?z', streamOnlySource),
    ], AF, BF);
    await expect(it).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:b') ],
        [ DF.variable('z'), DF.namedNode('ex:d') ],
      ]),
    ]);
    expect(asyncSource.queryBindings).toHaveBeenCalledTimes(1);
    expect(streamOnlySource.queryBindings).toHaveBeenCalledTimes(2);
  });

  it('keeps bindings without results for optional lookups', async() => {
    const it = new IndexNestedLoopIterator(input(), [
      lookup('?x', 'ex:p', '?y', syncSource),
      lookup('?y', 'ex:q', '?z', asyncSource, true),
      lookup('?z', 'ex:r', '?w', syncSource, true),
    ], AF, BF);
    await expect(it).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:b') ],
        [ DF.variable('z'), DF.namedNode('ex:d') ],
        [ DF.variable('w'), DF.namedNode('ex:e') ],
      ]),
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:c') ],
      ]),
    ]);
  });

  it('skips results that conflict with the bound bindings', async() => {
    const conflicting = <IQuerySource> <any> {
      queryBindingsSynchronous: () => [
        BF.bindings([[ DF.variable('x'), DF.namedNode('ex:other') ]]),
        BF.bindings([[ DF.variable('y'), DF.namedNode('ex:b') ]]),
      ],
    };
    const it = new IndexNestedLoopIterator(input(), [ lookup('?x', 'ex:p', '?y', conflicting) ], AF, BF);
    await expect(it).toEqualBindingsStream([
      BF.bindings([
        [ DF.variable('x'), DF.namedNode('ex:a') ],
        [ DF.variable('y'), DF.namedNode('ex:b') ],
      ]),
    ]);
  });

  it('produces nothing for an empty input', async() => {
    const it = new IndexNestedLoopIterator(new ArrayIterator<Bindings>([], { autoStart: false }), [
      lookup('?x', 'ex:p', '?y', syncSource),
    ], AF, BF);
    await expect(it).toEqualBindingsStream([]);
  });

  it('waits for input that is not available yet', async() => {
    const delayed = new BufferedIterator<Bindings>({ autoStart: false });
    const it = new IndexNestedLoopIterator(delayed, [ lookup('?x', 'ex:p', '?y', syncSource) ], AF, BF);
    expect(it.read()).toBeNull();
    expect(it.readable).toBeFalsy();
    const result = it.toArray();
    (<any> delayed)._push(BF.bindings([[ DF.variable('x'), DF.namedNode('ex:a') ]]));
    delayed.close();
    await expect(result).resolves.toHaveLength(2);
  });

  it('destroys itself on input errors', async() => {
    const failing = new BufferedIterator<Bindings>({ autoStart: false });
    const it = new IndexNestedLoopIterator(failing, [ lookup('?x', 'ex:p', '?y', syncSource) ], AF, BF);
    const result = it.toArray();
    failing.destroy(new Error('input failure'));
    await expect(result).rejects.toThrow('input failure');
  });

  it('destroys itself on lookup errors', async() => {
    const failingSource = <IQuerySource> <any> {
      queryBindings: () => {
        const stream = new BufferedIterator<Bindings>({ autoStart: false });
        setImmediate(() => stream.destroy(new Error('lookup failure')));
        return stream;
      },
    };
    const it = new IndexNestedLoopIterator(input(), [ lookup('?x', 'ex:p', '?y', failingSource) ], AF, BF);
    await expect(it.toArray()).rejects.toThrow('lookup failure');
  });

  it('only needs a bindings factory for lookups that are not patterns', () => {
    expect(IndexNestedLoopIterator.needsBindingsFactory([ lookup('?x', 'ex:p', '?y', syncSource) ])).toBe(false);
    expect(IndexNestedLoopIterator.needsBindingsFactory([
      lookup('?x', 'ex:p', '?y', syncSource),
      { operation: AF.createJoin([]), source: syncSource, context },
    ])).toBe(true);
  });

  it('destroys its input when ended early', () => {
    const stream = input();
    const it = new IndexNestedLoopIterator(stream, [ lookup('?x', 'ex:p', '?y', syncSource) ], AF, BF);
    it.destroy();
    expect(stream.done).toBeTruthy();
  });

  describe('looking up arbitrary length paths', () => {
    // A -> B -> C -> B, and D -> A
    let pathSource: IQuerySource;
    beforeEach(() => {
      const store = RdfStore.createDefault();
      const edges = [[ 'ex:a', 'ex:b' ], [ 'ex:b', 'ex:c' ], [ 'ex:c', 'ex:b' ], [ 'ex:d', 'ex:a' ]];
      for (const [ subject, object ] of edges) {
        store.addQuad(DF.quad(DF.namedNode(subject), DF.namedNode('ex:p'), DF.namedNode(object)));
      }
      pathSource = new QuerySourceRdfJs(store, DF, BF);
    });

    function path(subject: string, predicate: Algebra.Operation, object: string): Algebra.Path {
      const term = (value: string): any => value.startsWith('?') ? DF.variable(value.slice(1)) : DF.namedNode(value);
      return AF.createPath(term(subject), predicate, term(object));
    }

    function pathLookup(operation: Algebra.Path, source = pathSource): IIndexNestedLoopLookup {
      return { operation, source, context: new ActionContext(), path: getArbitraryLengthPathLookup(operation) };
    }

    async function lookUp(operation: Algebra.Path, inputTerm = 'ex:a', source = pathSource): Promise<string[]> {
      const it = new IndexNestedLoopIterator(new ArrayIterator<Bindings>([
        BF.bindings([[ DF.variable('x'), DF.namedNode(inputTerm) ]]),
      ], { autoStart: false }), [ pathLookup(operation, source) ], AF, BF);
      return (await it.toArray()).map(bindings => bindings.get('y')?.value ?? 'match');
    }

    const link = AF.createLink(DF.namedNode('ex:p'));

    it('recognizes arbitrary length paths over a single predicate', () => {
      expect(getArbitraryLengthPathLookup(path('?x', AF.createZeroOrMorePath(link), '?y'))).toEqual({
        link,
        predicate: DF.namedNode('ex:p'),
        inverse: false,
        includeStart: true,
      });
      expect(getArbitraryLengthPathLookup(path('?x', AF.createOneOrMorePath(AF.createInv(link)), '?y'))).toEqual({
        link,
        predicate: DF.namedNode('ex:p'),
        inverse: true,
        includeStart: false,
      });
    });

    it('does not recognize other operations', () => {
      expect(getArbitraryLengthPathLookup(AF.createPattern(DF.variable('x'), DF.namedNode('ex:p'), DF.variable('y'))))
        .toBeUndefined();
      expect(getArbitraryLengthPathLookup(path('?x', AF.createZeroOrOnePath(link), '?y'))).toBeUndefined();
      expect(getArbitraryLengthPathLookup(path('?x', AF.createZeroOrMorePath(AF.createSeq([ link, link ])), '?y')))
        .toBeUndefined();
      expect(getArbitraryLengthPathLookup(path('?x', AF.createZeroOrMorePath(AF.createInv(AF.createSeq([
        link,
        link,
      ]))), '?y'))).toBeUndefined();
      expect(getArbitraryLengthPathLookup(AF.createPath(
        DF.variable('x'),
        AF.createZeroOrMorePath(link),
        DF.variable('y'),
        DF.variable('g'),
      ))).toBeUndefined();
    });

    it('includes the start term for ZeroOrMore paths', async() => {
      await expect(lookUp(path('?x', AF.createZeroOrMorePath(link), '?y'))).resolves
        .toEqual([ 'ex:a', 'ex:b', 'ex:c' ]);
    });

    it('only includes the start term for OneOrMore paths if it is reached', async() => {
      await expect(lookUp(path('?x', AF.createOneOrMorePath(link), '?y'))).resolves.toEqual([ 'ex:b', 'ex:c' ]);
      await expect(lookUp(path('?x', AF.createOneOrMorePath(link), '?y'), 'ex:b')).resolves.toEqual([ 'ex:c', 'ex:b' ]);
    });

    it('walks backwards from a bound object', async() => {
      await expect(lookUp(path('?y', AF.createOneOrMorePath(link), '?x'))).resolves.toEqual([ 'ex:d' ]);
    });

    it('walks inverse paths', async() => {
      await expect(lookUp(path('?x', AF.createOneOrMorePath(AF.createInv(link)), '?y'))).resolves.toEqual([ 'ex:d' ]);
      await expect(lookUp(path('?y', AF.createZeroOrMorePath(AF.createInv(link)), '?x'))).resolves
        .toEqual([ 'ex:a', 'ex:b', 'ex:c' ]);
    });

    it('checks if a bound subject reaches a bound object', async() => {
      await expect(lookUp(path('ex:d', AF.createOneOrMorePath(link), '?x'), 'ex:c')).resolves.toEqual([ 'match' ]);
      await expect(lookUp(path('ex:b', AF.createOneOrMorePath(link), '?x'), 'ex:d')).resolves.toEqual([]);
    });

    it('destroys itself if the predicate can not be looked up synchronously', async() => {
      const stream = new IndexNestedLoopIterator(input(), [
        pathLookup(path('?x', AF.createZeroOrMorePath(link), '?y'), asyncSource),
      ], AF, BF);
      await expect(stream.toArray()).rejects.toThrow('Could not synchronously look up the path ex:p');
    });
  });
});
