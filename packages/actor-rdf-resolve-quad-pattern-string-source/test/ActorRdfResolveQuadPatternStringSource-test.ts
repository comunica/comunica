import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { DataFactory, Quad } from 'rdf-data-factory';
import { ActorRdfResolveQuadPatternStringSource } from '../lib/ActorRdfResolveQuadPatternStringSource';
const streamifyArray = require('streamify-array');
import arrayifyStream from 'arrayify-stream';
import 'jest-rdf';
import { Readable } from 'readable-stream';


const DF = new DataFactory();

describe('ActorRdfResolveQuadPatternStringSource', () => {
  let bus: any;
  const sourceValue = '<ex:s> <ex:p> <ex:o>';
  const sourceMediaType = 'text/turtle';
  const sourceBaseIri = 'http://example.org/';
  let mockMediatorRdfParse: any; // Return always the same quadstream
  let spyMockMediatorRdfParse: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveQuadPatternStringSource module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternStringSource).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternStringSource constructor', () => {
      const mediator = {mediate(_args: any){}};
      expect(new (<any> ActorRdfResolveQuadPatternStringSource)({ name: 'actor', bus , mediatorRdfParse:mediator}))
        .toBeInstanceOf(ActorRdfResolveQuadPatternStringSource);
      expect(new (<any> ActorRdfResolveQuadPatternStringSource)({ name: 'actor', bus, mediatorRdfParse:mediator }))
        .toBeInstanceOf(ActorRdfResolveQuadPattern);
    });

    it('should not be able to create new ActorRdfResolveQuadPatternStringSource objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternStringSource)(); }).toThrow();
    });
  });

  describe('The test method of an ActorRdfResolveQuadPatternRdfJsSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternStringSource({ name: 'actor', bus, mediatorRdfParse: mockMediatorRdfParse });
    });

    it('should test', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should test on different mediaType', () => {
      const mediaTypes = [ sourceMediaType, 'application/json', 'application/json+ld' ];

      for (const mediaType of mediaTypes) {
        expect(actor.test({ pattern: <any> null,
          context: new ActionContext(
            { [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: sourceValue, mediaType, baseIri: sourceBaseIri }},
          ) }))
          .resolves.toBeTruthy();
      }
    });

    it('should test on invalid source', () => {

      expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { "foo": { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }},
        ) }))
        .rejects.toBeTruthy();
    
    });

    it('should test when there is no baseIri', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType }},
        ) }))
        .resolves.toBeTruthy();
    });

    it('should no test on empty source', () => {
      const emptySource = '';
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: emptySource, mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: new ActionContext(
          { [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri },
            { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }]},
        ),
        pattern: <any> null },
      ))
        .rejects.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test(
        { context: new ActionContext(
          { [KeysRdfResolveQuadPattern.sources.name]: [{ type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri },
            { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }]},
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
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: rdfSource, mediaType: sourceMediaType }},
        ) })).rejects.toBeTruthy();
    });
  });
  

  describe('The run method of an ActorRdfResolveQuadPatternRdfJsSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;
    const expectedQuads: RDF.Quad[] = [
      DF.quad(DF.namedNode("ex:a"), DF.namedNode("ex:b"), DF.literal("c")),
      DF.quad(DF.namedNode("ex:a"), DF.namedNode("ex:d"), DF.literal("e"))
    ];

    beforeEach(() => {
      mockMediatorRdfParse = {
        mediate(_arg: any) {
          return {
            handle: {
              // streamifyArray has the side effect of comsuming the object hence the clone operation
              data: streamifyArray(JSON.parse(JSON.stringify(expectedQuads))), 
            },
          };
        },
      };
      spyMockMediatorRdfParse = jest.spyOn(mockMediatorRdfParse, 'mediate');
      actor = new ActorRdfResolveQuadPatternStringSource({ name: 'actor', bus, mediatorRdfParse: mockMediatorRdfParse });
    });

    it('should run', async() => {
      const context = new ActionContext({ name: 'context', [KeysRdfResolveQuadPattern.source.name]: { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIri: sourceBaseIri }});
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      }; // it can be anything the mediator returned always the same triples
      const op: any = {
        context,
        pattern: {
          context,
          pattern,
        },
      };


      const expectedTextStream = new Readable({ objectMode: true });
      expectedTextStream._read = () => {
        // Do nothing
      };
      expectedTextStream.push(<string>sourceValue);
      expectedTextStream.push(null);
      const expectedParseAction = {
          context: context,
          handle: {
            metadata: { baseIRI: sourceBaseIri },
            data: expectedTextStream,
            context: context,
          },
          handleMediaType: sourceMediaType,
        };

      const resp = await actor.run(op);
     
      // JSON.stringify is a workaround for the textstream as jest return an object instead of a readable
      expect(JSON.stringify(spyMockMediatorRdfParse.mock.calls[0][0])).toStrictEqual(JSON.stringify(expectedParseAction));
      expect( await resp.data.toArray()).toMatchObject(expectedQuads);
    });
  });
});
