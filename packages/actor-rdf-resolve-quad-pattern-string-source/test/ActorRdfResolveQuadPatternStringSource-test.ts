import type { IActionRdfParseHandle } from '@comunica/bus-rdf-parse';
import type { IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput } from '@comunica/bus-rdf-resolve-quad-pattern';
import { ActorRdfResolveQuadPattern } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';
import { Factory, type Algebra } from 'sparqlalgebrajs';
import { ActorRdfResolveQuadPatternStringSource } from '../lib/ActorRdfResolveQuadPatternStringSource';
import 'jest-rdf';

const streamifyArray = require('streamify-array');

const DF = new DataFactory();
const AF = new Factory(DF);

describe('ActorRdfResolveQuadPatternStringSource', () => {
  let bus: any;
  const cacheSize = 100;
  const sourceValue = 's0 <ex:p1> <ex:o1>. s0 <ex:p2> <ex:o2>.';
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

  describe('The test method of an ActorRdfResolveQuadPatternStringSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;

    beforeEach(() => {
      actor = new ActorRdfResolveQuadPatternStringSource(
        { name: 'actor',
          cacheSize,
          bus,
          mediatorRdfParse: mockMediatorRdfParse,
          mediatorRdfResolveQuadPattern: mockmediatorRdfResolveQuadPattern },
      );
    });

    it('should test', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: {
          type: ActorRdfResolveQuadPatternStringSource.sourceType,
          value: sourceValue,
          mediaType: sourceMediaType,
          baseIri: sourceBaseIri,
        }}) })).resolves.toBeTruthy();
    });

    it('should not test on invalid source', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext({ foo: {
          type: ActorRdfResolveQuadPatternStringSource.sourceType,
          value: sourceValue,
          mediaType: sourceMediaType,
          baseIri: sourceBaseIri,
        }}) })).rejects.toBeTruthy();
    });

    it('should test when there is no baseIri', () => {
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: {
          type: ActorRdfResolveQuadPatternStringSource.sourceType,
          value: sourceValue,
          mediaType: sourceMediaType,
        }}) })).resolves.toBeTruthy();
    });

    it('should not test on multiple sources', () => {
      return expect(actor.test({ context: new ActionContext({ [KeysRdfResolveQuadPattern.sources.name]: [
        {
          type: ActorRdfResolveQuadPatternStringSource.sourceType,
          value: sourceValue,
          mediaType: sourceMediaType,
          baseIri: sourceBaseIri,
        },
        {
          type: ActorRdfResolveQuadPatternStringSource.sourceType,
          value: sourceValue,
          mediaType: sourceMediaType,
          baseIri: sourceBaseIri,
        },
      ]}),
      pattern: <any> null })).rejects.toBeTruthy();
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
        context: new ActionContext({ [KeysRdfResolveQuadPattern.source.name]: {
          value: ActorRdfResolveQuadPatternStringSource.sourceType,
          mediaType: sourceMediaType,
        }}) })).resolves.toBeTruthy();
    });

    it('should not test on source with no type and no mediatype', () => {
      const rdfSource: RDF.Source = { match: () => <any> null };
      return expect(actor.test({ pattern: <any> null,
        context: new ActionContext(
          { [KeysRdfResolveQuadPattern.source.name]: { value: ActorRdfResolveQuadPatternStringSource.sourceType }},
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

  describe('The run method of an ActorRdfResolveQuadPatternStringSource instance', () => {
    let actor: ActorRdfResolveQuadPatternStringSource;

    // The function here attempts to simulate the generation of different blank node identifiers on subsequent
    // parses of a string source, to make sure the actor caches the first parse result and uses it for subsequent
    // patterns. Otherwise the blank nodes will have different identifiers for different patterns, and queries
    // with multiple patterns will fail to produce results.
    const parserOutput = (parseCount: number) => [
      DF.quad(DF.blankNode(`s${parseCount}`), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
      DF.quad(DF.blankNode(`s${parseCount}`), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
    ];

    const pattern: Algebra.Pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const expectedQuads: RDF.Quad[] = parserOutput(0);

    const source = {
      type: ActorRdfResolveQuadPatternStringSource.sourceType,
      value: sourceValue,
      mediaType: sourceMediaType,
      baseIRI: sourceBaseIri,
    };

    beforeEach(() => {
      mockMediatorRdfParse = {
        parseCount: 0,
        mediate(_arg: IActionRdfParseHandle) {
          return {
            handle: {
              data: streamifyArray(parserOutput(this.parseCount++)),
            },
          };
        },
      };
      mockmediatorRdfResolveQuadPattern = {
        mediate(_arg: IActionRdfResolveQuadPattern) {
          const contextSource: Record<string, any> = _arg.context.getSafe<any>(KeysRdfResolveQuadPattern.source);
          const rdfSource: RDF.Source = contextSource.value;
          return {
            data: wrap(rdfSource.match()),
          };
        },
      };
      spyMockMediatorRdfParse = jest.spyOn(mockMediatorRdfParse, 'mediate');
      spyMockmediatorRdfResolveQuadPattern = jest.spyOn(mockmediatorRdfResolveQuadPattern, 'mediate');
      actor = new ActorRdfResolveQuadPatternStringSource({ name: 'actor',
        cacheSize,
        bus,
        mediatorRdfParse: mockMediatorRdfParse,
        mediatorRdfResolveQuadPattern: mockmediatorRdfResolveQuadPattern });
    });

    it('should produce expected results more than once', async() => {
      for (let execution = 0; execution < 2; execution++) {
        const context = new ActionContext({
          name: 'context',
          [KeysRdfResolveQuadPattern.source.name]: source,
        });

        const op: IActionRdfResolveQuadPattern = { context, pattern };

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
        const data = await resp.data.toArray();

        if (execution === 0) {
          expect(JSON.stringify(spyMockMediatorRdfParse.mock.calls[0][0]))
            .toStrictEqual(JSON.stringify(expectedParseAction));
        } else {
          expect(spyMockMediatorRdfParse).toHaveBeenCalledTimes(1);
        }

        expect(spyMockmediatorRdfResolveQuadPattern).toBeCalledWith(expect.objectContaining({
          pattern: op.pattern,
        }));

        expect(data).toMatchObject(expectedQuads);
      }
    });
  });
});
