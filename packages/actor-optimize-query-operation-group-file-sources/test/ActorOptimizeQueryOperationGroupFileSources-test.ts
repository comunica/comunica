import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { assignOperationSource, getOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorOptimizeQueryOperationGroupFileSources } from '../lib/ActorOptimizeQueryOperationGroupFileSources';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

function createFileSource(url: string): IQuerySourceWrapper {
  const store: any = RdfStore.createDefault(true);
  const source = new QuerySourceRdfJs(store, DF, BF);
  source.referenceValue = url;
  return { source };
}

function createNonFileSource(ref: any): IQuerySourceWrapper {
  return <any> {
    source: {
      referenceValue: ref,
      getSelectorShape: jest.fn(),
      queryBindings: jest.fn(),
      queryQuads: jest.fn(),
      queryBoolean: jest.fn(),
      queryVoid: jest.fn(),
    },
  };
}

describe('ActorOptimizeQueryOperationGroupFileSources', () => {
  let bus: any;
  let mediatorQuerySourceIdentify: any;
  let compositeWrapper: IQuerySourceWrapper;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    compositeWrapper = createNonFileSource('composite');
    mediatorQuerySourceIdentify = {
      mediate: jest.fn().mockResolvedValue({ querySource: compositeWrapper }),
    };
  });

  describe('An ActorOptimizeQueryOperationGroupFileSources instance', () => {
    let actor: ActorOptimizeQueryOperationGroupFileSources;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationGroupFileSources({
        name: 'actor',
        bus,
        mediatorQuerySourceIdentify,
      });
    });

    describe('isFileSource', () => {
      it('should return true for QuerySourceRdfJs with string referenceValue', () => {
        const wrapper = createFileSource('http://example.org/file.ttl');
        expect(ActorOptimizeQueryOperationGroupFileSources.isFileSource(wrapper)).toBe(true);
      });

      it('should return false for QuerySourceRdfJs with non-string referenceValue', () => {
        const store = RdfStore.createDefault(true);
        const source = new QuerySourceRdfJs(store, DF, BF);
        // ReferenceValue defaults to the store object (non-string)
        const wrapper: IQuerySourceWrapper = { source };
        expect(ActorOptimizeQueryOperationGroupFileSources.isFileSource(wrapper)).toBe(false);
      });

      it('should return false for non-QuerySourceRdfJs sources', () => {
        const wrapper = createNonFileSource('http://example.org/sparql');
        expect(ActorOptimizeQueryOperationGroupFileSources.isFileSource(wrapper)).toBe(false);
      });
    });

    describe('test', () => {
      it('should pass when there is no top-level source', async() => {
        await expect(actor.test({
          operation: AF.createNop(),
          context: new ActionContext(),
        })).resolves.toPassTestVoid();
      });

      it('should fail when the operation has a top-level source', async() => {
        const source = createNonFileSource('src');
        await expect(actor.test({
          operation: assignOperationSource(AF.createNop(), source),
          context: new ActionContext(),
        })).resolves.toFailTest('Actor actor does not work with top-level operation sources.');
      });
    });

    describe('run', () => {
      const ctx = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });

      it('should not modify operation when there are fewer than 2 file sources', async() => {
        const fileSource = createFileSource('http://example.org/file1.ttl');
        const nonFileSource = createNonFileSource('http://example.org/sparql');
        const querySources = [ fileSource, nonFileSource ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);
        const opIn = AF.createNop();

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
        expect(ctxOut.get(KeysQueryOperation.querySources)).toBe(querySources);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should not modify operation when there are no sources', async() => {
        const context = ctx;
        const opIn = AF.createNop();

        const { operation } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should not modify operation when there is only 1 file source', async() => {
        const fileSource = createFileSource('http://example.org/file1.ttl');
        const context = ctx.set(KeysQueryOperation.querySources, [ fileSource ]);
        const opIn = AF.createNop();

        const { operation } = await actor.run({ operation: opIn, context });

        expect(operation).toBe(opIn);
        expect(mediatorQuerySourceIdentify.mediate).not.toHaveBeenCalled();
      });

      it('should group 2 file sources into a single compositefile source in a UNION', async() => {
        const fileSource1 = createFileSource('http://example.org/file1.ttl');
        const fileSource2 = createFileSource('http://example.org/file2.ttl');
        const querySources = [ fileSource1, fileSource2 ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);

        const pattern = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o'));
        const child1 = assignOperationSource({ ...pattern }, fileSource1);
        const child2 = assignOperationSource({ ...pattern }, fileSource2);
        const opIn = AF.createUnion([ child1, child2 ], false);

        const { operation, context: ctxOut } = await actor.run({ operation: opIn, context });

        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: {
            type: 'compositefile',
            value: [ 'http://example.org/file1.ttl', 'http://example.org/file2.ttl' ],
          },
          context,
        });

        // The UNION with 2 identical file source patterns should collapse to a single pattern
        expect(getOperationSource(operation)).toBe(compositeWrapper);

        // QuerySources updated to remove individual file sources and add compositefile
        const newSources = ctxOut.get(KeysQueryOperation.querySources)!;
        expect(newSources).not.toContain(fileSource1);
        expect(newSources).not.toContain(fileSource2);
        expect(newSources).toContain(compositeWrapper);
      });

      it('should group file sources but keep non-file sources in UNION', async() => {
        const fileSource1 = createFileSource('http://example.org/file1.ttl');
        const fileSource2 = createFileSource('http://example.org/file2.ttl');
        const nonFileSource = createNonFileSource('http://example.org/sparql');
        const querySources = [ fileSource1, fileSource2, nonFileSource ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);

        const pattern = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o'));
        const child1 = assignOperationSource({ ...pattern }, fileSource1);
        const child2 = assignOperationSource({ ...pattern }, fileSource2);
        const child3 = assignOperationSource({ ...pattern }, nonFileSource);
        const opIn = AF.createUnion([ child1, child2, child3 ], false);

        const { operation } = await actor.run({ operation: opIn, context });

        // Should be UNION(composite, sparql)
        expect(operation.type).toBe('union');
        const union: any = operation;
        expect(union.input).toHaveLength(2);
        expect(getOperationSource(union.input[0])).toBe(compositeWrapper);
        expect(getOperationSource(union.input[1])).toBe(nonFileSource);
      });

      it('should not modify a UNION with fewer than 2 file source children', async() => {
        const fileSource1 = createFileSource('http://example.org/file1.ttl');
        const fileSource2 = createFileSource('http://example.org/file2.ttl');
        const nonFileSource1 = createNonFileSource('http://example.org/sparql1');
        const nonFileSource2 = createNonFileSource('http://example.org/sparql2');
        const querySources = [ fileSource1, fileSource2, nonFileSource1, nonFileSource2 ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);

        const pattern = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o'));
        // Only 1 file source in this union
        const child1 = assignOperationSource({ ...pattern }, fileSource1);
        const child2 = assignOperationSource({ ...pattern }, nonFileSource1);
        const child3 = assignOperationSource({ ...pattern }, nonFileSource2);
        const opIn = AF.createUnion([ child1, child2, child3 ], false);

        const { operation } = await actor.run({ operation: opIn, context });

        // Should remain unchanged
        expect(operation).toEqual(opIn);
      });

      it('should handle nested UNION operations', async() => {
        const fileSource1 = createFileSource('http://example.org/file1.ttl');
        const fileSource2 = createFileSource('http://example.org/file2.ttl');
        const querySources = [ fileSource1, fileSource2 ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);

        const pattern1 = AF.createPattern(DF.namedNode('s'), DF.namedNode('p1'), DF.variable('o'));
        const pattern2 = AF.createPattern(DF.namedNode('s'), DF.namedNode('p2'), DF.variable('o'));

        // Two separate UNIONs with file sources (from assign-sources-exhaustive)
        const union1 = AF.createUnion([
          assignOperationSource({ ...pattern1 }, fileSource1),
          assignOperationSource({ ...pattern1 }, fileSource2),
        ], false);
        const union2 = AF.createUnion([
          assignOperationSource({ ...pattern2 }, fileSource1),
          assignOperationSource({ ...pattern2 }, fileSource2),
        ], false);
        const opIn = AF.createJoin([ union1, union2 ]);

        const { operation } = await actor.run({ operation: opIn, context });

        // Both inner UNIONs should collapse to single composite-source patterns
        const join: any = operation;
        expect(join.type).toBe('join');
        expect(getOperationSource(join.input[0])).toBe(compositeWrapper);
        expect(getOperationSource(join.input[1])).toBe(compositeWrapper);
      });

      it('should update querySources in context', async() => {
        const fileSource1 = createFileSource('http://example.org/file1.ttl');
        const fileSource2 = createFileSource('http://example.org/file2.ttl');
        const nonFileSource = createNonFileSource('http://example.org/sparql');
        const querySources = [ fileSource1, fileSource2, nonFileSource ];
        const context = ctx.set(KeysQueryOperation.querySources, querySources);

        const pattern = AF.createPattern(DF.namedNode('s'), DF.namedNode('p'), DF.variable('o'));
        const opIn = AF.createUnion([
          assignOperationSource({ ...pattern }, fileSource1),
          assignOperationSource({ ...pattern }, fileSource2),
          assignOperationSource({ ...pattern }, nonFileSource),
        ], false);

        const { context: ctxOut } = await actor.run({ operation: opIn, context });

        const newSources = ctxOut.get(KeysQueryOperation.querySources)!;
        expect(newSources).toHaveLength(2);
        expect(newSources).toContain(nonFileSource);
        expect(newSources).toContain(compositeWrapper);
        expect(newSources).not.toContain(fileSource1);
        expect(newSources).not.toContain(fileSource2);
      });
    });
  });
});
