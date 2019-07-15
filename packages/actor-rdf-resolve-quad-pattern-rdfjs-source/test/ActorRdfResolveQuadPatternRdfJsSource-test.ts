import {ActorRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Bus} from "@comunica/core";
import * as RDF from "rdf-js";
import {ActorRdfResolveQuadPatternRdfJsSource} from "../lib/ActorRdfResolveQuadPatternRdfJsSource";

// tslint:disable:object-literal-sort-keys

describe('ActorRdfResolveQuadPatternRdfJsSource', () => {
  let bus;

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
      source = { match: () => null };
    });

    it('should test', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: source  } }) }))
        .resolves.toBeTruthy();
    });

    it('should not test without a context', () => {
      return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
    });

    it('should not test without a source', () => {
      return expect(actor.test({ pattern: null, context: ActionContext({}) })).rejects.toBeTruthy();
    });

    it('should not test on an invalid source', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: null } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on an invalid source type', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'rdfjsSource', value: {} } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no source', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'entrypoint', value: null } }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on no sources', () => {
      return expect(actor.test({ pattern: null, context: ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:sources': [] }) }))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ type: 'rdfjsSource', value: source },
          { type: 'rdfjsSource', value: source }] }), pattern: null }))
        .rejects.toBeTruthy();
    });

    it('should get the source', () => {
      return expect((<any> actor).getSource(ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source':
          { type: 'rdfjsSource', value: source } })))
        .resolves.toMatchObject(source);
    });

    it('should always expose empty metadata', async () => {
      return expect(await (<any> actor).getMetadata()()).toEqual({});
    });
  });
});
