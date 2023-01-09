import type { IActorRdfResolveQuadPatternOutput } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import { ActorRdfResolveQuadPatternStringSource } from '../lib/ActorRdfResolveQuadPatternStringSource';
import 'jest-rdf';

const streamifyArray = require('streamify-array');

const DF = new DataFactory();

describe('ActorRdfResolveQuadPatternStringSource', () => {
  let bus: any;
  const sourceValue = '<ex:s> <ex:p> <ex:o>';
  const sourceMediaType = 'text/turtle';
  const sourceBaseIri = 'http://example.org/';
  let mockMediatorRdfParse: any;
  let mockmediatorRdfResolveQuadPattern: any;
  let spyMockMediatorRdfParse: any;
  let spyMockmediatorRdfResolveQuadPattern: any;

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
          mediatorRdfResolveQuadPattern: mockmediatorRdfResolveQuadPattern },
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
          { [KeysRdfResolveQuadPattern.source.name]: { type: 'foo', value: rdfSource }},
        ) })).rejects.toBeTruthy();
    });

    it('should test on source with no type and a mediatype', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { value: 'stringSource', mediaType: sourceMediaType }},
        ) })).resolves.toBeTruthy();
    });

    it('should not test on source with no type and no mediatype', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { value: 'stringSource' }},
        ) })).rejects.toBeTruthy();
    });

    it('should not test on a source value that is not a string and no type', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]:
            { value: rdfSource, mediaType: sourceMediaType }},
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
              data: streamifyArray([
                DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.literal('c')),
                DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:d'), DF.literal('e')),
              ]),
            },
          };
        },
      };
      mockmediatorRdfResolveQuadPattern = {
        mediate(_arg: any) {
          return {
            data: wrap(streamifyArray([
              DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:b'), DF.literal('c')),
              DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:d'), DF.literal('e')),
            ])),
          };
        },
      };
      spyMockMediatorRdfParse = jest.spyOn(mockMediatorRdfParse, 'mediate');
      spyMockmediatorRdfResolveQuadPattern = jest.spyOn(mockmediatorRdfResolveQuadPattern, 'mediate');
      actor = new ActorRdfResolveQuadPatternStringSource({ name: 'actor',
        bus,
        mediatorRdfParse: mockMediatorRdfParse,
        mediatorRdfResolveQuadPattern: mockmediatorRdfResolveQuadPattern });
    });

    it('should run', async() => {
      const context = new ActionContext({ name: 'context',
        [KeysRdfResolveQuadPattern.source.name]:
      { type: 'stringSource', value: sourceValue, mediaType: sourceMediaType, baseIRI: sourceBaseIri }});
      const pattern: any = {
        subject: DF.variable('s'),
        predicate: DF.namedNode('p'),
        object: DF.variable('o'),
        graph: DF.variable('g'),
      };
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
        context,
        handle: {
          metadata: { baseIRI: sourceBaseIri },
          data: expectedTextStream,
          context,
        },
        handleMediaType: sourceMediaType,
      };

      const resp: IActorRdfResolveQuadPatternOutput = await actor.run(op);

      expect(JSON.stringify(spyMockMediatorRdfParse.mock.calls[0][0]))
        .toStrictEqual(JSON.stringify(expectedParseAction));

      expect(spyMockmediatorRdfResolveQuadPattern).toBeCalledWith(expect.objectContaining({
        pattern: op.pattern,
      }));

      expect(await resp.data.toArray()).toMatchObject(expectedQuads);
    });
  });
});
