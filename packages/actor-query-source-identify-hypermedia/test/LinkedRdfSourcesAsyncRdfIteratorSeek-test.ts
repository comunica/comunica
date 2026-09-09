import { LinkQueueFifo } from '@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo';
import { ActionContext } from '@comunica/core';
import type { ILink, ILinkQueue, MetadataBindings } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState, SourceStateGetter } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { LinkedRdfSourcesAsyncRdfIterator } from '../lib/LinkedRdfSourcesAsyncRdfIterator';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const v = DF.variable('v');

/**
 * A sorted source that counts the bindings it had to produce, and can skip ahead.
 * Skipping is done over the array iterator's own buffer, which is what a store with a sorted
 * index does at a coarser granularity.
 */
function createSource(values: number[], seekable = true): any {
  const it: any = new ArrayIterator<RDF.Bindings>(
    values.map(value => BF.bindings([[ v, DF.literal(String(value).padStart(6, '0')) ]])),
    { autoStart: false },
  );
  it.produced = 0;
  it.seekCalls = 0;
  const read = it.read.bind(it);
  it.read = () => {
    const item = read();
    if (item !== null) {
      it.produced++;
    }
    return item;
  };
  if (seekable) {
    it.seek = (target: RDF.Bindings) => {
      it.seekCalls++;
      const value = target.get(v)!.value;
      while (it._buffer && it._index < it._buffer.length && it._buffer[it._index].get(v)!.value < value) {
        it._index++;
      }
    };
  }
  return it;
}

// Deliberately does not override hasSourceLinks, so that it falls back on the conservative default.
class Blind extends LinkedRdfSourcesAsyncRdfIterator {
  public linkQueue: ILinkQueue | undefined;

  public async getLinkQueue(): Promise<ILinkQueue> {
    return this.linkQueue ??= new LinkQueueFifo();
  }

  protected async getSourceLinks(metadata: Record<string, any>): Promise<ILink[]> {
    return metadata.page === 0 && metadata.multi ? [{ url: 'P1' }] : [];
  }

  protected async accumulateMetadata(a: MetadataBindings, b: MetadataBindings): Promise<MetadataBindings> {
    return { ...a, ...b };
  }
}

class Dummy extends Blind {
  protected override async hasSourceLinks(metadata: Record<string, any>): Promise<boolean> {
    return (await this.getSourceLinks(metadata)).length > 0;
  }
}

/**
 * @param pages The values each source produces, already sorted.
 * @param options Shape of the sources to build.
 * @param options.multi Whether a second source follows the first.
 * @param options.ordered Whether the sources declare an order.
 * @param options.seekable Whether the sources can skip ahead.
 * @param created Called with every source iterator as it is created.
 * @param Iterator The iterator class to build.
 */
function build(
  pages: number[][],
  options: { multi?: boolean; ordered?: boolean; seekable?: boolean } = {},
  created: (source: any) => void = () => {
    // Ignored by default
  },
  Iterator: new (...args: ConstructorParameters<typeof Blind>) => Blind = Dummy,
): Blind {
  const { multi = false, ordered = true, seekable = true } = options;
  const sourceStateGetter: SourceStateGetter = async(link: ILink): Promise<ISourceState> => {
    const page = link.url === 'P1' ? 1 : 0;
    return {
      link,
      handledDatasets: {},
      metadata: <any>{ page, multi },
      source: <any>{
        queryBindings() {
          // Created here, so that the initial readable event lands after the layer subscribes to it.
          const source = createSource(pages[page], seekable);
          source.setProperty('metadata', {
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: pages[page].length },
            order: ordered ? [{ term: v, direction: 'asc' }] : undefined,
            page,
            multi,
            variables: [{ variable: v, canBeUndef: false }],
          });
          created(source);
          return source;
        },
      },
    };
  };
  return new Iterator(AF.createPattern(v, v, v, v), {}, new ActionContext(), { url: 'P0' }, 64, sourceStateGetter);
}

function label(value: number): string {
  return String(value).padStart(6, '0');
}

describe('LinkedRdfSourcesAsyncRdfIterator order and seek', () => {
  describe('the order it reports', () => {
    it('is the source order when a single source feeds it', async() => {
      const it = build([[ 1, 3, 5, 7 ]]);
      await expect(new Promise(resolve => it.getProperty('metadata', resolve)))
        .resolves.toMatchObject({ order: [{ term: v, direction: 'asc' }]});
      it.destroy();
    });

    it('is the source order once a single source has been read', async() => {
      const it = build([[ 1, 3, 5, 7 ]]);
      expect((await it.toArray()).map(bindings => bindings.get(v)!.value))
        .toEqual([ 1, 3, 5, 7 ].map(label));
      expect(it.getProperty<MetadataBindings>('metadata')!.order).toEqual([{ term: v, direction: 'asc' }]);
    });

    it('is withheld in the preflight when a second source follows', async() => {
      const it = build([[ 1, 3, 5, 7 ], [ 2, 4, 6, 8 ]], { multi: true });
      await expect(new Promise(resolve => it.getProperty('metadata', resolve)))
        .resolves.toMatchObject({ order: undefined });
      it.destroy();
    });

    it('is withheld when a second source follows, whose concatenation is not sorted', async() => {
      const it = build([[ 1, 3, 5, 7 ], [ 2, 4, 6, 8 ]], { multi: true });
      expect((await it.toArray()).map(bindings => bindings.get(v)!.value))
        .toEqual([ 1, 3, 5, 7, 2, 4, 6, 8 ].map(label));
      expect(it.getProperty<MetadataBindings>('metadata')!.order).toBeUndefined();
    });

    it('is withheld when the iterator cannot tell whether links follow', async() => {
      // Blind falls back to the conservative answer of the base implementation.
      const it = build([[ 1, 3, 5, 7 ]], {}, () => {
        // Not needed here
      }, Blind);
      await expect(new Promise(resolve => it.getProperty('metadata', resolve)))
        .resolves.toMatchObject({ order: undefined });
      it.destroy();
    });

    it('is absent when the sources declare none', async() => {
      const it = build([[ 1, 3, 5, 7 ]], { ordered: false });
      await expect(it.toArray()).resolves.toHaveLength(4);
      expect(it.getProperty<MetadataBindings>('metadata')!.order).toBeUndefined();
    });
  });

  describe('seek', () => {
    it('reaches the source, which then skips the bindings before the target', async() => {
      let source: any;
      const it = build([[ ...Array.from({ length: 1000 }).keys() ]], {}, (created) => {
        source = created;
      });

      const seen: string[] = [];
      let sought = false;
      await new Promise<void>((resolve, reject) => {
        it.on('error', reject);
        it.on('data', (bindings: RDF.Bindings) => {
          seen.push(bindings.get(v)!.value);
          if (!sought && seen.length === 10) {
            sought = true;
            it.seek(BF.bindings([[ v, DF.literal(label(900)) ]]));
          }
        });
        it.on('end', resolve);
      });

      expect(source.seekCalls).toBe(1);
      // The tail from the target onwards is intact.
      expect(seen.slice(-100)).toEqual(Array.from({ length: 100 }, (_, index) => label(900 + index)));
      // And the source never produced the bindings the seek skipped over, beyond those already buffered.
      expect(source.produced).toBeLessThan(200);
    });

    it('is ignored by a source that cannot skip', async() => {
      const it = build([[ 1, 3, 5, 7 ]], { seekable: false });
      await expect(new Promise(resolve => it.getProperty('metadata', resolve))).resolves.toBeDefined();
      expect(() => it.seek(BF.bindings([[ v, DF.literal(label(5)) ]]))).not.toThrow();
      expect((await it.toArray()).map(bindings => bindings.get(v)!.value))
        .toEqual([ 1, 3, 5, 7 ].map(label));
    });

    it('is applied to a source started after the call', async() => {
      const sources: any[] = [];
      const it = build([[ 1, 3, 5, 7 ]], {}, source => sources.push(source));
      it.seek(BF.bindings([[ v, DF.literal(label(5)) ]]));
      expect((await it.toArray()).map(bindings => bindings.get(v)!.value))
        .toEqual([ 5, 7 ].map(label));
      expect(sources.every(source => source.seekCalls === 1)).toBe(true);
    });
  });
});
