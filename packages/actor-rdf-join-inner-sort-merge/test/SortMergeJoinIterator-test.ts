import '@comunica/jest';
import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfJoinSortMerge } from '../lib/ActorRdfJoinSortMerge';
import { SortMergeJoinIterator } from '../lib/SortMergeJoinIterator';

const BF = new BindingsFactory();
const DF = new DataFactory();

describe('SortMergeJoinIterator', () => {
  it('should handle empty iterators', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, []),
    )).toEqualBindingsStream([]);
  });

  it('should handle one non-empty and one empty iterator', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, []),
    )).toEqualBindingsStream([]);
  });

  it('should handle one empty and one non-empty iterator', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, []),
    )).toEqualBindingsStream([]);
  });

  it('should handle iterators with one common var', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
      }),
    ]);
  });

  it('should handle iterators with one common var and other non-common vars', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2'),
      }),
    ]);
  });

  it('should handle iterators with two common vars and other non-common vars', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          aa: DF.namedNode('a0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          aa: DF.namedNode('a4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          aa: DF.namedNode('a1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2x'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          aa: DF.namedNode('a3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
        DF.variable('aa'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        aa: DF.namedNode('a2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2'),
      }),
    ]);
  });

  it('should handle iterators with two common vars and other non-common vars with multiple results', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          aa: DF.namedNode('a0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          aa: DF.namedNode('a4'),
          b: DF.namedNode('b4'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          aa: DF.namedNode('a6'),
          b: DF.namedNode('b6'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          aa: DF.namedNode('a1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          aa: DF.namedNode('a2x'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          aa: DF.namedNode('a3'),
          c: DF.namedNode('c3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          aa: DF.namedNode('a4'),
          c: DF.namedNode('c4'),
        }),
        BF.fromRecord({
          a: DF.namedNode('5'),
          aa: DF.namedNode('a5'),
          c: DF.namedNode('c5'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          aa: DF.namedNode('a6'),
          c: DF.namedNode('c6'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
        DF.variable('aa'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        aa: DF.namedNode('a2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('4'),
        aa: DF.namedNode('a4'),
        b: DF.namedNode('b4'),
        c: DF.namedNode('c4'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        aa: DF.namedNode('a6'),
        b: DF.namedNode('b6'),
        c: DF.namedNode('c6'),
      }),
    ]);
  });

  it('should handle iterators with undefs', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          b: DF.namedNode('b-2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        b: DF.namedNode('b-2'),
        c: DF.namedNode('c1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        c: DF.namedNode('c2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from left to right (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from left to right', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from right to left (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.3'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from right to left', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional (reduced2)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.3'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2.3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from left to right in 2 chunks (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from left to right in 2 chunks', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('5'),
          c: DF.namedNode('c5'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2.3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3.3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from right to left in 2 chunks (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.3'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.1'),
        c: DF.namedNode('c3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.2'),
        c: DF.namedNode('c3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.3'),
        c: DF.namedNode('c3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches from right to left in 2 chunks', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('5'),
          c: DF.namedNode('c5'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.3'),
        c: DF.namedNode('c2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.1'),
        c: DF.namedNode('c3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.2'),
        c: DF.namedNode('c3'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.3'),
        c: DF.namedNode('c3'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional in 2 chunks (reduced)', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          b: DF.namedNode('b3.2'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3.2'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.1'),
        c: DF.namedNode('c3.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.2'),
        c: DF.namedNode('c3.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.1'),
        c: DF.namedNode('c3.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('3'),
        b: DF.namedNode('b3.2'),
        c: DF.namedNode('c3.2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional in 2 chunks', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          b: DF.namedNode('b6.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          b: DF.namedNode('b6.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('8'),
          b: DF.namedNode('b8'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          c: DF.namedNode('c6.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          c: DF.namedNode('c6.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('7'),
          c: DF.namedNode('c7'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.1'),
        c: DF.namedNode('c6.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.2'),
        c: DF.namedNode('c6.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.1'),
        c: DF.namedNode('c6.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.2'),
        c: DF.namedNode('c6.2'),
      }),
    ]);
  });

  it('should handle iterators with multiple join matches bidirectional in 2 chunks and more', async() => {
    await expect(new SortMergeJoinIterator(
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('0'),
          b: DF.namedNode('b0'),
        }),
        BF.fromRecord({
          a: DF.namedNode('1'),
          b: DF.namedNode('b1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          b: DF.namedNode('b2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('4'),
          b: DF.namedNode('b4'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          b: DF.namedNode('b6.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          b: DF.namedNode('b6.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('8'),
          b: DF.namedNode('b8'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z10'),
          b: DF.namedNode('bz10'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z11'),
          b: DF.namedNode('bz11'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z12'),
          b: DF.namedNode('bz12'),
        }),
      ], { autoStart: false }),
      new ArrayIterator<RDF.Bindings>([
        BF.fromRecord({
          a: DF.namedNode('1'),
          c: DF.namedNode('c1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('2'),
          c: DF.namedNode('c2.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('3'),
          c: DF.namedNode('c3'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          c: DF.namedNode('c6.1'),
        }),
        BF.fromRecord({
          a: DF.namedNode('6'),
          c: DF.namedNode('c6.2'),
        }),
        BF.fromRecord({
          a: DF.namedNode('7'),
          c: DF.namedNode('c7'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z10'),
          c: DF.namedNode('cz10'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z11'),
          c: DF.namedNode('cz11'),
        }),
        BF.fromRecord({
          a: DF.namedNode('z12'),
          c: DF.namedNode('cz12'),
        }),
      ], { autoStart: false }),
      ActorRdfJoin.joinBindings,
      ActorRdfJoinSortMerge.compareBindings.bind(this, [
        DF.variable('a'),
      ]),
    )).toEqualBindingsStream([
      BF.fromRecord({
        a: DF.namedNode('1'),
        b: DF.namedNode('b1'),
        c: DF.namedNode('c1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.1'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('2'),
        b: DF.namedNode('b2.2'),
        c: DF.namedNode('c2.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.1'),
        c: DF.namedNode('c6.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.2'),
        c: DF.namedNode('c6.1'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.1'),
        c: DF.namedNode('c6.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('6'),
        b: DF.namedNode('b6.2'),
        c: DF.namedNode('c6.2'),
      }),
      BF.fromRecord({
        a: DF.namedNode('z10'),
        b: DF.namedNode('bz10'),
        c: DF.namedNode('cz10'),
      }),
      BF.fromRecord({
        a: DF.namedNode('z11'),
        b: DF.namedNode('bz11'),
        c: DF.namedNode('cz11'),
      }),
      BF.fromRecord({
        a: DF.namedNode('z12'),
        b: DF.namedNode('bz12'),
        c: DF.namedNode('cz12'),
      }),
    ]);
  });
});
