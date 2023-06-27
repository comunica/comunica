import { Readable } from 'stream';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorRdfResolveQuadPatternRdfJsSource, RdfJsQuadSource } from '..';
import 'jest-rdf';

const DF = new DataFactory();

describe('ActorRdfResolveQuadPatternRdfJsSource', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfResolveQuadPatternRdfJsSource module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternRdfJsSource).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternRdfJsSource constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternRdfJsSource)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternRdfJsSource);
      expect(new (<any> ActorRdfResolveQuadPatternRdfJsSource)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternRdfJsSource objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternRdfJsSource)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternRdfJsSource instance', () => {
    let actor: ActorRdfResolveQuadPatternRdfJsSource;
    let source: RDF.Source;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternRdfJsSource({ name: 'actor', bus });
      source = { match: () => <any> null };
    });

    it('should test', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'rdfjsSource', value: source }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should test on raw source form', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: source },
        ) }))
        .resolves.toBeTruthy();
    });

    it('should not test without a source', () => {
      return expect(actor.test({ pattern: <any> null, context: new ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'rdfjsSource', value: undefined }},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on an invalid source type', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'rdfjsSource', value: {}}},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'entrypoint', value: null }},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': []},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: new ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'rdfjsSource', value: source },
            { type: 'rdfjsSource', value: source }]},
        ),
        pattern: <any> null },
      ))
        .rejects.toBeTruthy();
    });

    it('should get the source', () => {
      return expect((<any> actor).getSource(new ActionContext({ [KeysRdfResolveQuadPattern.source.name]:
          { type: 'rdfjsSource', value: source }})))
        .resolves.toMatchObject(new RdfJsQuadSource(source));
    });

    it('should get the source on raw source form', () => {
      return expect((<any> actor).getSource(new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: source })))
        .resolves.toMatchObject(new RdfJsQuadSource(source));
    });

    it('should run with a real store', async() => {
      const store = new Store();
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
      context = new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: store });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      expect(await arrayifyStream(data)).toEqualRdfQuadArray([
        DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')),
      ]);
      expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 2 },
          canContainUndefs: false,
          state: expect.any(MetadataValidationState) });
    });

    describe('with a real store supporting quoted triple filtering', () => {
      let store: any;
      beforeEach(() => {
        store = RdfStore.createDefault();
      });

      it('should run when containing quoted triples', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.namedNode('p'),
          object: DF.variable('o'),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'exact', value: 3 },
            canContainUndefs: false,
          });
      });

      it('should run when containing quoted triples with a quoted pattern (1)', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.namedNode('p'),
          object: DF.quad(
            DF.variable('s1'), DF.variable('p1'), DF.variable('o1'),
          ),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'exact', value: 1 },
            canContainUndefs: false,
          });
      });

      it('should run when containing quoted triples with a quoted pattern (2)', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.variable('p'),
          object: DF.quad(
            DF.variable('s1'), DF.namedNode('pbx'), DF.variable('o1'),
          ),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'exact', value: 1 },
            canContainUndefs: false,
          });
      });

      it('should run when containing nested quoted triples with a nested quoted pattern', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.quad(
            DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
          ),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.variable('p'),
          object: DF.quad(
            DF.variable('s1'), DF.namedNode('pbx'), DF.quad(
              DF.variable('s2'), DF.variable('pcx'), DF.variable('o2'),
            ),
          ),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'), DF.namedNode('pbx'), DF.quad(
              DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
            ),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'exact', value: 1 },
            canContainUndefs: false,
          });
      });
    });

    describe('with a real store not supporting quoted triple filtering', () => {
      let store: any;
      beforeEach(() => {
        store = new Store();
      });

      it('should run when containing quoted triples', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.namedNode('p'),
          object: DF.variable('o'),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'exact', value: 3 },
            canContainUndefs: false,
          });
      });

      it('should run when containing quoted triples with a quoted pattern (1)', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.namedNode('p'),
          object: DF.quad(
            DF.variable('s1'), DF.variable('p1'), DF.variable('o1'),
          ),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
            DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 3 },
            canContainUndefs: false,
          });
      });

      it('should run when containing quoted triples with a quoted pattern (2)', async() => {
        store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
        store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
        store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('p'), DF.quad(
          DF.namedNode('sa3'), DF.namedNode('pax'), DF.namedNode('oa3'),
        )));
        store.addQuad(DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
          DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
        )));
        context = new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: store,
        });
        const pattern: any = {
          subject: DF.variable('s'),
          predicate: DF.variable('p'),
          object: DF.quad(
            DF.variable('s1'), DF.namedNode('pbx'), DF.variable('o1'),
          ),
          graph: DF.variable('g'),
        };
        const { data } = await actor.run({ pattern, context });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('s4'), DF.namedNode('px'), DF.quad(
            DF.namedNode('sb3'), DF.namedNode('pbx'), DF.namedNode('ob3'),
          )),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({
            state: expect.any(MetadataValidationState),
            cardinality: { type: 'estimate', value: 5 },
            canContainUndefs: false,
          });
      });
    });

    it('should use countQuads for metadata if available', async() => {
      source = <any> { countQuads: () => 123, match: () => new ArrayIterator([ 0, 1, 2 ]) };
      context = new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: source });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 123 },
          canContainUndefs: false,
          state: expect.any(MetadataValidationState) });
    });

    it('should use match for metadata if countQuads is not available', async() => {
      source = <any> { match: () => new ArrayIterator([ 0, 1, 2 ]) };
      context = new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: source });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
        .toEqual({ cardinality: { type: 'exact', value: 3 },
          canContainUndefs: false,
          state: expect.any(MetadataValidationState) });
    });

    it('should delegate its error event', async() => {
      const it = new Readable();
      it._read = () => {
        it.emit('error', new Error('RdfJsSource error'));
      };
      source = <any> { match: () => it };
      context = new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: source });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      await expect(arrayifyStream(data)).rejects.toThrow(new Error('RdfJsSource error'));
    });
  });
});
