import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfResolveQuadPatternStringSource } from '../lib/ActorRdfResolveQuadPatternStringSource';
const streamifyArray = require('streamify-array');
import 'jest-rdf';
const streamifyString = require('streamify-string');

const DF = new DataFactory();

describe('ActorRdfResolveQuadPatternStringSource', () => {
  let bus: any;
  const sourceValue = '<ex:s> <ex:p> <ex:o>';
  const sourceMediaType = 'text/turtle';
  const sourceBaseIri = 'http://example.org/';
  let mockMediatorRdfParse: any; // Return always the same quadstream
  let mockMediatorRdfQuadPattern: any; // Return always the same quadstream
  let spyMockMediatorRdfParse: any;
  let spyMockMediatorRdfQuadPattern: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternStringSource module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternStringSource).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternStringSource constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternStringSource)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPatternStringSource);
      expect(new (<any> ActorRdfResolveQuadPatternStringSource)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternStringSource objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternStringSource)(); }).toThrow();
    });
  });

  describe('The test method of an ActorRdfResolveQuadPatternRdfJsSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternStringSource(
        { name: 'actor',
          bus,
          mediatorRdfParse: mockMediatorRdfParse,
          mediatorRdfQuadPattern: mockMediatorRdfQuadPattern },
      );
    });

    it('should test', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]:
            { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should test on invalid source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { foo: { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }},
        ) }))
        .rejects.toBeTruthy();
    });

    it('should test when there is no baseIri', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]:
            { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should no test on empty source', () => {
      const emptySource = '';
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]:
            { type: 'stringSource', value: emptySource, mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: new ActionContext(
          { [KeysRdfResolveQuadPattern.sources.name]:
            [{ type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri },
              { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri },
            ]},
        ),
        pattern: <any> null },
      ))
        .rejects.toBeTruthy();
    });

    it('should not test on the wrong source type', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'foo', value: rdfSource, mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });

    it('should not test on source with no type', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { value: 'stringSource', mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });

    it('should not test on a source value that is not a string', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]:
            { type: 'stringSource', value: rdfSource, mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });
  });

  describe('The run method of an ActorRdfResolveQuadPatternRdfJsSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;
    const expectedQuads: RDF.Quad[] = [
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.literal('c')),
      DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:d'), DF.literal('e')),
    ];

    beforeEach(() => {
      mockMediatorRdfParse = {
        mediate(_arg: any) {
          return {
            handle: {
              // StreamifyArray has the side effect of comsuming the object hence the clone operation
              data: streamifyArray(JSON.parse(JSON.stringify(expectedQuads))),
            },
          };
        },
      };
      mockMediatorRdfQuadPattern = {
        mediate(_arg: any) {
          return {
            // StreamifyArray has the side effect of comsuming the object hence the clone operation
            data: streamifyArray(JSON.parse(JSON.stringify(expectedQuads))),
          };
        },
      };
      spyMockMediatorRdfParse = jest.spyOn(mockMediatorRdfParse, 'mediate');
      spyMockMediatorRdfQuadPattern = jest.spyOn(mockMediatorRdfQuadPattern, 'mediate');
      actor = new ActorRdfResolveQuadPatternStringSource({ name: 'actor',
        bus,
        mediatorRdfParse: mockMediatorRdfParse,
        mediatorRdfQuadPattern: mockMediatorRdfQuadPattern });
    });

    it('should run', async() => {
      const context = new ActionContext({ name: 'context',
        [KeysRdfResolveQuadPattern.source.name]:
      { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }});
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      }; // It can be anything the mediator returned always the same triples
      const op: any = {
        context,
        pattern: {
          context,
          pattern,
        },
      };

      const expectedTextStream = streamifyString(<string> sourceValue);
      const expectedParseAction = {
        context,
        handle: {
          metadata: { baseIRI: sourceBaseIri },
          data: expectedTextStream,
          context,
        },
        handleMediaType: sourceMediaType,
      };

      const resp = await actor.run(op);

      expect(spyMockMediatorRdfParse).toBeCalledWith(expect.objectContaining(expectedParseAction));

      expect(spyMockMediatorRdfQuadPattern).toBeCalledWith(expect.objectContaining({
        pattern: op.pattern,
      }));

      expect(await resp.data.toArray()).toMatchObject(expectedQuads);
    });
  });
});
