import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {ActorRdfResolveQuadPatternRdfJsSource} from "../lib/ActorRdfResolveQuadPatternRdfJsSource";
import {ArrayIterator} from "asynciterator";
import {namedNode, variable} from "@rdfjs/data-model";

// tslint:disable:object-literal-sort-keys

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
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: source  } }) }))
        .resolves.toBeTruthy();
    });

    it('should test on raw source form', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:source': source }) }))
          .resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: <any> null, context: undefined })).rejects.toBeTruthy();
    });

    it('should not test without a source', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid source', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: undefined } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on an invalid source type', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: {} } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no source', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'entrypoint', value: null } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: <any> null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': [] }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'rdfjsSource', value: source },
          { type: 'rdfjsSource', value: source }] }), pattern: <any> null }))
        .rejects.toBeTruthy();
    });

    it('should get the source', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'rdfjsSource', value: source } })))
        .resolves.toMatchObject(source);
    });

    it('should get the source on raw source form', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': source })))
          .resolves.toMatchObject(source);
    });

    it('should use countQuads for metadata if available', async () => {
      source = <any> { countQuads: () => 123 };
      return expect(await (<any> actor).getMetadata(source,
          { subject: variable('s'), predicate: namedNode('p') })()).toEqual({ totalItems: 123 });
    });

    it('should use match for metadata if countQuads is not available', async () => {
      source = <any> { match: () => new ArrayIterator([0, 1, 2]) };
      return expect(await (<any> actor).getMetadata(source,
          { subject: variable('s'), predicate: namedNode('p') })()).toEqual({ totalItems: 3 });
    });
  });
});
