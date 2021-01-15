import type { ActorRdfDereference, IActionRdfDereference,
  IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import type { ActorRdfMetadata, IActionRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type {
  ActorRdfMetadataExtract,
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
} from '@comunica/bus-rdf-metadata-extract';
import type { ActionContext, IActorTest, Mediator } from '@comunica/core';
import { SingletonIterator } from 'asynciterator';
import * as _ from 'lodash';
import type * as RDF from 'rdf-js';
import { MediatedPagedAsyncRdfIterator } from '../lib/MediatedPagedAsyncRdfIterator';
import { PagedAsyncRdfIterator } from '../lib/PagedAsyncRdfIterator';

// Used to access protected functions
class Dummy extends MediatedPagedAsyncRdfIterator {
  public constructor(firstPageUrl: string,
    firstPageData: RDF.Stream,
    firstPageMetadata: () => Promise<Record<string, any>>,
    mediatorRdfDereference: Mediator<ActorRdfDereference,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    mediatorMetadata: Mediator<ActorRdfMetadata,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    mediatorMetadataExtract: Mediator<ActorRdfMetadataExtract,
    IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>,
    context: ActionContext) {
    super(firstPageUrl,
      firstPageData,
      firstPageMetadata,
      mediatorRdfDereference,
      mediatorMetadata,
      mediatorMetadataExtract,
      context);
  }

  public async getIterator(url: string, page: number, onNextPage: (nextPage: string) => void) {
    return super.getIterator(url, page, onNextPage);
  }
}

describe('MediatedPagedAsyncRdfIterator', () => {
  describe('The MediatedPagedAsyncRdfIterator module', () => {
    it('should be a MediatedPagedAsyncRdfIterator constructor', () => {
      expect(new (<any> MediatedPagedAsyncRdfIterator)('url', new SingletonIterator(''), {}, {}, {}, {}))
        .toBeInstanceOf(MediatedPagedAsyncRdfIterator);
      expect(new (<any> MediatedPagedAsyncRdfIterator)('url', new SingletonIterator(''), {}, {}, {}, {}))
        .toBeInstanceOf(PagedAsyncRdfIterator);
    });
  });

  describe('A MediatedPagedAsyncRdfIterator instance', () => {
    let actor: Dummy;
    let firstPageMetadata: any;
    let mediatorRdfDereference: any;
    let mediatorMetadata: any;
    let mediatorMetadataExtract: any;

    beforeEach(() => {
      firstPageMetadata = () => ({ then: (f: any) => f({ next: 'NEXT' }) });
      mediatorRdfDereference = {};
      mediatorMetadata = {};
      mediatorMetadataExtract = {};

      actor = new (<any> Dummy)('URL',
        new SingletonIterator('DATA'),
        firstPageMetadata,
        mediatorRdfDereference,
        mediatorMetadata,
        mediatorMetadataExtract);
    });

    it('handles the first page', done => {
      // eslint-disable-next-line import/namespace
      const callback = _.after(2, done);

      actor.getIterator('URL', 0, nextPage => {
        expect(nextPage).toBe('NEXT');
        callback();
      }).then(stream => {
        expect(stream.read()).toBe('DATA');
        callback();
      }).catch(done);
    });

    it('handles incorrect first page metadata', done => {
      const thisFirstPageMetadata = () => Promise.reject(new Error('MediatedPagedAsyncRdfIterator-test'));
      const thisActor = new (<any> Dummy)('URL',
        new SingletonIterator('DATA'),
        thisFirstPageMetadata,
        mediatorRdfDereference,
        mediatorMetadata,
        mediatorMetadataExtract);
      thisActor.on('data', () => {
        // Do nothing
      });
      thisActor.on('error', () => { done(); });
    });

    it('handles the next page', done => {
      // eslint-disable-next-line import/namespace
      const callback = _.after(2, done);

      mediatorRdfDereference.mediate = (o: any) => {
        expect(o.url).toBe('URL');
        return Promise.resolve({ url: 'PAGEURL', quads: 'QUADS' });
      };

      mediatorMetadata.mediate = (o: any) => {
        expect(o.url).toBe('PAGEURL');
        expect(o.quads).toBe('QUADS');
        return Promise.resolve({ data: new SingletonIterator('DATA'), metadata: 'METADATA' });
      };

      mediatorMetadataExtract.mediate = (o: any) => {
        expect(o.url).toBe('PAGEURL');
        expect(o.metadata).toBe('METADATA');
        return Promise.resolve({ metadata: { next: 'NEXT' }});
      };

      actor.getIterator('URL', 1, nextPage => {
        expect(nextPage).toBe('NEXT');
        callback();
      }).then(stream => {
        expect(stream.read()).toBe('DATA');
        callback();
      }).catch(done);
    });

    it('handles incorrect next page metadata', done => {
      // eslint-disable-next-line import/namespace
      const callback = _.after(2, done);

      mediatorRdfDereference.mediate = (o: any) => {
        expect(o.url).toBe('URL');
        return Promise.resolve({ url: 'PAGEURL', quads: 'QUADS' });
      };

      mediatorMetadata.mediate = (o: any) => {
        expect(o.url).toBe('PAGEURL');
        expect(o.quads).toBe('QUADS');
        return Promise.resolve({ data: new SingletonIterator('DATA'), metadata: 'METADATA' });
      };

      mediatorMetadataExtract.mediate = (o: any) => {
        expect(o.url).toBe('PAGEURL');
        expect(o.metadata).toBe('METADATA');
        return Promise.reject(new Error('error'));
      };

      actor.on('error', () => { done(); });
      actor.getIterator('URL', 1, () => {
        // Do nothing
      }).catch(done);
    });
  });
});
