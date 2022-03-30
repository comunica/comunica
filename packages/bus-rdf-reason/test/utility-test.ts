import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import type { IReasonGroup } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import {
  getExplicitSources, getSafeData, setImplicitSource, getContextWithImplicitDataset,
} from '../lib/ActorRdfReason';

const { namedNode, quad } = DataFactory;

describe('getContextWithImplicitDataset', () => {
  let store: Store;
  let factory: () => Store;
  let data: IReasonGroup;

  beforeEach(() => {
    store = new Store();
    data = {
      dataset: store,
      status: { type: 'full', reasoned: false },
      context: new ActionContext(),
    };
    factory = () => new Store();
  });

  it('Should throw an error if there is no data object or source generator', () => {
    expect(() => getContextWithImplicitDataset(new ActionContext())).toThrowError();
  });

  it('Should keep the original data key object if one is present', () => {
    let context = new ActionContext({ [KeysRdfReason.data.name]: data });
    let newContext = getContextWithImplicitDataset(context);

    expect(context).toEqual(newContext);
    expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset === store).toEqual(true);

    context = new ActionContext({
      [KeysRdfReason.data.name]: data,
      [KeysRdfReason.implicitDatasetFactory.name]: factory,
    });

    newContext = getContextWithImplicitDataset(context);

    expect(context).toEqual(newContext);
    expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset === store).toEqual(true);
  });

  it('Should generate a data object if none are present', () => {
    const context = new ActionContext({ [KeysRdfReason.implicitDatasetFactory.name]: factory });
    expect(getContextWithImplicitDataset(context).get(KeysRdfReason.data)).toBeDefined();
    expect(getContextWithImplicitDataset(context).get<IReasonGroup>(KeysRdfReason.data)?.dataset).toBeInstanceOf(Store);
  });

  describe('setImplicitSource', () => {
    let context: IActionContext;
    let indicatorQuad: RDF.Quad;
    beforeEach(() => {
      context = new ActionContext({
        [KeysRdfReason.implicitDatasetFactory.name]: factory,
        [KeysRdfReason.data.name]: data,
      });
      indicatorQuad = quad(
        namedNode('http://example.org/subject'),
        namedNode('http://example.org/predicate'),
        namedNode('http://example.org/object'),
        namedNode('http://example.org/graph'),
      );
      store.addQuad(indicatorQuad);
    });

    it('With no original source or sources', () => {
      const newContext = setImplicitSource(context);
      expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.get(KeysRdfResolveQuadPattern.source)).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.has(KeysRdfResolveQuadPattern.sources)).toEqual(false);
    });

    it('With a original source but no sources', () => {
      const newContext = setImplicitSource(context.set(KeysRdfResolveQuadPattern.source, new Store()));
      expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.get(KeysRdfResolveQuadPattern.source)).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.has(KeysRdfResolveQuadPattern.sources)).toEqual(false);
    });

    it('With original sources but no source', () => {
      const newContext = setImplicitSource(
        context.set(KeysRdfResolveQuadPattern.sources, [ new Store(), new Store() ]),
      );
      expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.get(KeysRdfResolveQuadPattern.source)).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.has(KeysRdfResolveQuadPattern.sources)).toEqual(false);
    });

    it('With original sources and source', () => {
      const newContext = setImplicitSource(
        context
          .set(KeysRdfResolveQuadPattern.sources, [ new Store(), new Store() ])
          .set(KeysRdfResolveQuadPattern.source, new Store()),
      );
      expect(newContext.get<IReasonGroup>(KeysRdfReason.data)?.dataset).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.get(KeysRdfResolveQuadPattern.source)).toBeRdfDatasetContaining(indicatorQuad);
      expect(newContext.has(KeysRdfResolveQuadPattern.sources)).toEqual(false);
    });
  });

  describe('getSafeData', () => {
    it('Should run if the data is available', () => {
      expect(getSafeData(new ActionContext({ [KeysRdfReason.data.name]: data }))).toEqual(data);
    });
    it('Should eror if the data is available', () => {
      expect(() => getSafeData(new ActionContext())).toThrowError();
    });
  });

  describe('getExplicitSources', () => {
    expect(getExplicitSources(new ActionContext())).toEqual([]);
    expect(getExplicitSources(new ActionContext({
      [KeysRdfResolveQuadPattern.source.name]: 'source1',
    }))).toEqual([ 'source1' ]);
    expect(getExplicitSources(new ActionContext({
      [KeysRdfResolveQuadPattern.sources.name]: [ 'source0', 'source2' ],
    }))).toEqual([ 'source0', 'source2' ]);
    // TODO: Address this case
    // expect(getExplicitSources(new ActionContext({
    //   [KeysRdfResolveQuadPattern.source.name]: 'source1',
    //   [KeysRdfResolveQuadPattern.sources.name]: ['source0', 'source2']
    // }))).toEqual(['source0', 'source2']);
  });
});
