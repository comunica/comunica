import type { Bindings, IQuerySource } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { IIndexNestedLoopLookup } from '../lib/IndexNestedLoopIterator';
import { IndexNestedLoopIterator } from '../lib/IndexNestedLoopIterator';
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

  it('destroys its input when ended early', () => {
    const stream = input();
    const it = new IndexNestedLoopIterator(stream, [ lookup('?x', 'ex:p', '?y', syncSource) ], AF, BF);
    it.destroy();
    expect(stream.done).toBeTruthy();
  });
});
