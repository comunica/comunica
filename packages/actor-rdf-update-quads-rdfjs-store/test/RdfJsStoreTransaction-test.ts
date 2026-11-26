import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { termToString } from 'rdf-string';
import { RdfJsStoreTransaction } from '../lib/RdfJsStoreTransaction';
import type { DeletedGraphs, ISynchronousStore, StoreChange } from '../lib/RdfJsStoreView';
import { RdfJsStoreView } from '../lib/RdfJsStoreView';

const DF = new DataFactory();
const subjects = [ 's0', 's1', 's2' ].map(value => DF.namedNode(value));
const predicates = [ 'p0', 'p1' ].map(value => DF.namedNode(value));
const objects = [ DF.namedNode('o0'), DF.namedNode('o1'), DF.literal('o2') ];
const graphs = [ DF.defaultGraph(), DF.namedNode('g0'), DF.namedNode('g1') ];

// A seeded generator of random numbers, so that failures can be reproduced
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function randomQuads(random: () => number, count: number): RDF.Quad[] {
  const pick = <T>(terms: T[]): T => terms[Math.floor(random() * terms.length)];
  return Array.from({ length: count }, () =>
    DF.quad(pick(subjects), pick(predicates), pick(objects), <RDF.Quad_Graph> pick(graphs)));
}

function randomChange(random: () => number): StoreChange {
  const kind = random();
  if (kind < 0.4) {
    return { type: 'insert', quads: randomQuads(random, 1 + Math.floor(random() * 6)) };
  }
  if (kind < 0.8) {
    return { type: 'delete', quads: randomQuads(random, 1 + Math.floor(random() * 6)) };
  }
  const options: DeletedGraphs[] = [
    'ALL',
    'NAMED',
    DF.defaultGraph(),
    [ DF.namedNode('g0') ],
    <RDF.NamedNode[]> graphs.slice(1),
  ];
  return { type: 'deleteGraphs', graphs: options[Math.floor(random() * options.length)] };
}

function inGraphs(quad: RDF.Quad, graphs: DeletedGraphs): boolean {
  if (graphs === 'ALL') {
    return true;
  }
  if (graphs === 'NAMED') {
    return quad.graph.termType !== 'DefaultGraph';
  }
  return (Array.isArray(graphs) ? graphs : [ graphs ]).some(graph => graph.equals(quad.graph));
}

// Apply a change to a store directly, as the reference of what a transaction must result in
function applyDirectly(store: ISynchronousStore, change: StoreChange): void {
  if (change.type === 'insert') {
    for (const quad of change.quads) {
      store.addQuad(quad);
    }
  } else if (change.type === 'delete') {
    for (const quad of change.quads) {
      store.removeQuad(quad);
    }
  } else {
    for (const quad of store.getQuads().filter(candidate => inGraphs(candidate, change.graphs))) {
      store.removeQuad(quad);
    }
  }
}

// All patterns over the vocabulary, with each position bound or a wildcard
const patterns: (RDF.Term | undefined)[][] = [];
for (const subject of [ undefined, subjects[0] ]) {
  for (const predicate of [ undefined, predicates[1] ]) {
    for (const object of [ undefined, objects[2] ]) {
      for (const graph of [ undefined, ...graphs ]) {
        patterns.push([ subject, predicate, object, graph ]);
      }
    }
  }
}

function keys(quads: RDF.Quad[]): string[] {
  return quads.map(quad => termToString(quad)).sort();
}

const stores: Record<string, () => ISynchronousStore> = {
  'rdf-stores': () => <ISynchronousStore> <unknown> RdfStore.createDefault(),
  'ordered rdf-stores': () => <ISynchronousStore> <unknown> RdfStore.createOrdered(),
  N3: () => <ISynchronousStore> <unknown> new Store(),
};

describe.each(Object.keys(stores))('with a %s store', (kind) => {
  let store: ISynchronousStore;
  let reference: ISynchronousStore;

  beforeEach(() => {
    store = stores[kind]();
    reference = stores[kind]();
    for (const quad of randomQuads(generator(1), 20)) {
      store.addQuad(quad);
      reference.addQuad(quad);
    }
  });

  describe('RdfJsStoreView', () => {
    it.each([ 1, 2, 3, 4, 5, 6 ])('shows the store with random changes, as seeded with %d', async(seed) => {
      const random = generator(seed);
      const view = new RdfJsStoreView(store);
      const before = keys(store.getQuads());
      for (let step = 0; step < 12; step++) {
        const change = randomChange(random);
        view.apply(change);
        applyDirectly(reference, change);
        for (const pattern of patterns) {
          expect(view.countQuads(...pattern)).toBe(reference.countQuads(...pattern));
          await expect(arrayifyStream(view.match(...pattern)).then(keys))
            .resolves.toEqual(keys(reference.getQuads(...pattern)));
        }
      }
      // The store itself is not changed
      expect(keys(store.getQuads())).toEqual(before);
    });

    it('takes variables in patterns as wildcards', async() => {
      const view = new RdfJsStoreView(store);
      view.apply({ type: 'insert', quads: [ DF.quad(subjects[0], predicates[0], objects[0]) ]});
      const variable = DF.variable('x');
      expect(view.countQuads(variable, null, variable, variable)).toBe(store.countQuads() + 1);
      await expect(arrayifyStream(view.match(variable, predicates[0])).then(quads => quads.length))
        .resolves.toBe(store.countQuads(undefined, predicates[0]) + 1);
    });

    it('reads stores without readQuads', async() => {
      const getQuads = store.getQuads.bind(store);
      const view = new RdfJsStoreView(<ISynchronousStore> <unknown> {
        countQuads: store.countQuads.bind(store),
        getQuads,
      });
      await expect(arrayifyStream(view.match()).then(keys)).resolves.toEqual(keys(getQuads()));
    });
  });

  describe('RdfJsStoreTransaction', () => {
    it.each([ 1, 2, 3, 4, 5, 6 ])('applies random changes on commit, as seeded with %d', async(seed) => {
      const random = generator(seed);
      const transaction = new RdfJsStoreTransaction(store);
      for (let step = 0; step < 12; step++) {
        const change = randomChange(random);
        applyDirectly(reference, change);
        if (change.type === 'insert') {
          await transaction.update({ insert: new ArrayIterator(change.quads, { autoStart: false }) });
        } else if (change.type === 'delete') {
          await transaction.update({ delete: new ArrayIterator(change.quads, { autoStart: false }) });
        } else {
          await transaction.deleteGraphs(change.graphs, false, false);
        }
        // Later operations read the changes so far
        await expect(arrayifyStream(transaction.source!.match()).then(keys))
          .resolves.toEqual(keys(reference.getQuads()));
      }
      await transaction.commit();
      expect(keys(store.getQuads())).toEqual(keys(reference.getQuads()));
      expect(transaction.source).toBeUndefined();
    });

    it('does not change the store when rolled back', async() => {
      const before = keys(store.getQuads());
      const transaction = new RdfJsStoreTransaction(store);
      await transaction.update({
        delete: new ArrayIterator(store.getQuads(), { autoStart: false }),
        insert: new ArrayIterator(randomQuads(generator(2), 5), { autoStart: false }),
      });
      await transaction.deleteGraphs('ALL', false, false);
      await transaction.rollback();
      expect(keys(store.getQuads())).toEqual(before);
      expect(transaction.source).toBeUndefined();
      await transaction.commit();
      expect(keys(store.getQuads())).toEqual(before);
    });
  });
});

describe('RdfJsStoreTransaction', () => {
  let store: ISynchronousStore;
  let transaction: RdfJsStoreTransaction;
  const quad = DF.quad(subjects[0], predicates[0], objects[0], DF.namedNode('g0'));

  beforeEach(() => {
    store = <ISynchronousStore> <unknown> RdfStore.createDefault();
    transaction = new RdfJsStoreTransaction(store);
  });

  it('has a source only once it has changes, which is new after every change', async() => {
    expect(transaction.source).toBeUndefined();
    await transaction.update({
      insert: new ArrayIterator<RDF.Quad>([], { autoStart: false }),
      delete: new ArrayIterator<RDF.Quad>([], { autoStart: false }),
    });
    await transaction.update({});
    expect(transaction.source).toBeUndefined();
    await transaction.update({ insert: new ArrayIterator([ quad ], { autoStart: false }) });
    const first = transaction.source;
    expect(first).toBeDefined();
    expect(transaction.source).toBe(first);
    await transaction.update({ delete: new ArrayIterator([ quad ], { autoStart: false }) });
    expect(transaction.source).not.toBe(first);
  });

  it('creates graphs that do not exist yet, also with the changes so far', async() => {
    const graph = DF.namedNode('g0');
    await expect(transaction.createGraphs([ graph ], true)).resolves.toBeUndefined();
    store.addQuad(quad);
    await expect(transaction.createGraphs([ graph ], true))
      .rejects.toThrow('Unable to create graph g0 as it already exists');
    await expect(transaction.createGraphs([ graph ], false)).resolves.toBeUndefined();
    await transaction.deleteGraphs([ graph ], true, true);
    await expect(transaction.createGraphs([ graph ], true)).resolves.toBeUndefined();
    await transaction.update({ insert: new ArrayIterator([ quad ], { autoStart: false }) });
    await expect(transaction.createGraphs([ graph ], true))
      .rejects.toThrow('Unable to create graph g0 as it already exists');
  });

  it('adds consecutive insertions together on commit', async() => {
    const addQuads = jest.spyOn(<Required<ISynchronousStore>> store, 'addQuads');
    const quads = randomQuads(generator(3), 6);
    await transaction.update({ insert: new ArrayIterator(quads.slice(0, 3), { autoStart: false }) });
    await transaction.update({ insert: new ArrayIterator(quads.slice(3), { autoStart: false }) });
    await transaction.commit();
    expect(addQuads).toHaveBeenCalledTimes(1);
    expect(addQuads.mock.calls[0][0]).toEqual(quads);
  });

  it('adds quads one by one to stores without addQuads', async() => {
    const target = <ISynchronousStore> <unknown> new Store();
    const addQuad = jest.spyOn(target, 'addQuad');
    (<any> target).addQuads = undefined;
    transaction = new RdfJsStoreTransaction(target);
    await transaction.update({ insert: new ArrayIterator([ quad ], { autoStart: false }) });
    await transaction.commit();
    expect(addQuad).toHaveBeenCalledWith(quad);
    expect(target.countQuads()).toBe(1);
  });
});
