import { Readable } from 'stream';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActionContext, Bus } from '@comunica/core';
import { ArrayIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { ActorRdfResolveQuadPatternRdfJsSource, RdfJsQuadSource } from '..';
import 'jest-rdf';

const DF = new DataFactory();
const arrayifyStream = require('arrayify-stream');

describe('ActorRdfResolveQuadPatternRdfJsSource', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
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
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: source }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should test on raw source form', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': source },
        ) }))
        .resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: <any> null, context: undefined })).rejects.toBeTruthy();
    });

    it('should not test without a source', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: undefined }},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on an invalid source type', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: {}}},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'entrypoint', value: null }},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: <any> null,
        context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': []},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'rdfjsSource', value: source },
            { type: 'rdfjsSource', value: source }]},
        ),
        pattern: <any> null },
      ))
        .rejects.toBeTruthy();
    });

    it('should get the source', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'rdfjsSource', value: source }})))
        .resolves.toMatchObject(new RdfJsQuadSource(source));
    });

    it('should get the source on raw source form', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': source })))
        .resolves.toMatchObject(new RdfJsQuadSource(source));
    });

    it('should run with a real store', async() => {
      const store = new Store();
      store.addQuad(DF.quad(DF.namedNode('s1'), DF.namedNode('p'), DF.namedNode('o1')));
      store.addQuad(DF.quad(DF.namedNode('s2'), DF.namedNode('p'), DF.namedNode('o2')));
      store.addQuad(DF.quad(DF.namedNode('s3'), DF.namedNode('px'), DF.namedNode('o3')));
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': store });
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
        .toEqual({ totalItems: 2 });
    });

    it('should use countQuads for metadata if available', async() => {
      source = <any> { countQuads: () => 123, match: () => new ArrayIterator([ 0, 1, 2 ]) };
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': source });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      expect(await new Promise(resolve => data.getProperty('metadata', resolve))).toEqual({ totalItems: 123 });
    });

    it('should use match for metadata if countQuads is not available', async() => {
      source = <any> { match: () => new ArrayIterator([ 0, 1, 2 ]) };
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': source });
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
      const { data } = await actor.run({ pattern, context });
      expect(await new Promise(resolve => data.getProperty('metadata', resolve))).toEqual({ totalItems: 3 });
    });

    it('should delegate its error event', async() => {
      const it = new Readable();
      it._read = () => {
        it.emit('error', new Error('RdfJsSource error'));
      };
      source = <any> { match: () => it };
      const context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': source });
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
