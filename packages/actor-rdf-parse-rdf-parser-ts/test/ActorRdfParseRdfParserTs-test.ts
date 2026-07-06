import { Readable } from 'node:stream';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfParseRdfParserTs } from '../lib/ActorRdfParseRdfParserTs';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorRdfParseRdfParserTs', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('The ActorRdfParseRdfParserTs module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseRdfParserTs).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseRdfParserTs constructor', () => {
      expect(new (<any>ActorRdfParseRdfParserTs)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseRdfParserTs);
      expect(new (<any>ActorRdfParseRdfParserTs)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseRdfParserTs objects without \'new\'', () => {
      expect(() => {
        (<any>ActorRdfParseRdfParserTs)();
      }).toThrow(`Class constructor ActorRdfParseRdfParserTs cannot be invoked without 'new'`);
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => {
        new ActorRdfParseRdfParserTs(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
        );
      }).toBeTruthy();
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseRdfParserTs(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => {
        new ActorRdfParseRdfParserTs(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
      }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseRdfParserTs(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toBe(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseRdfParserTs(
        { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
      )
        .mediaTypePriorities).toEqual({
        A: 1,
        B: 0.5,
        C: 0,
      });
    });
  });

  describe('An ActorRdfParseRdfParserTs instance', () => {
    let actor: ActorRdfParseRdfParserTs;
    let input: Readable;
    let inputQuoted: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseRdfParserTs({
        bus,
        mediaTypePriorities: {
          'application/trig': 1,
          'application/n-quads': 0.7,
          'text/turtle': 0.6,
          'application/n-triples': 0.3,
        },
        mediaTypeFormats: {},
        name: 'actor',
      });
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = Readable.from([ `
          <a> <b> <c>.
          <d> <e> <f>.
      ` ]);
        inputQuoted = Readable.from([ `
          << <a> <b> <c> >> <b> <c>.
          <d> <e> <f>.
      ` ]);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error('ParseRdfParserTs'));
      });

      it('should test on TriG', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/trig', context }))
          .resolves.toPassTest({ handle: true });
      });

      it('should test on N-Quads', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-quads', context }))
          .resolves.toPassTest({ handle: true });
      });

      it('should test on Turtle', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/turtle', context }))
          .resolves.toPassTest({ handle: true });
      });

      it('should test on Turtle with quoted triples', async() => {
        await expect(actor
          .test({ handle: { data: inputQuoted, context }, handleMediaType: 'text/turtle', context }))
          .resolves.toPassTest({ handle: true });
      });

      it('should test on N-Triples', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-triples', context }))
          .resolves.toPassTest({ handle: true });
      });

      it('should not test on N3', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/n3', context }))
          .resolves.toFailTest(`Unrecognized media type: text/n3`);
      });

      it('should not test on JSON-LD', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/ld+json', context }))
          .resolves.toFailTest(`Unrecognized media type: application/ld+json`);
      });

      it('should run on text/turtle', async() => {
        await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/turtle',
          context,
        })
          .then(async(output: any) => await expect(arrayifyStream(output.handle.data)).resolves.toHaveLength(2));
      });

      it('should run on application/trig', async() => {
        await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/trig',
          context,
        })
          .then(async(output: any) => await expect(arrayifyStream(output.handle.data)).resolves.toHaveLength(2));
      });

      it('should forward stream errors', async() => {
        await expect(arrayifyStream((<any>(await actor.run(
          { handle: { data: inputError, context }, handleMediaType: 'application/trig', context },
        )))
          .handle.data)).rejects.toBeTruthy();
      });

      it('should not perform an out-of-band version check', async() => {
        await actor.run({
          handle: { data: input, metadata: { baseIRI: '', version: '1.2-invalid' }, context },
          handleMediaType: 'application/trig',
          context,
        })
          .then(async(output: any) => await expect(arrayifyStream(output.handle.data)).resolves.toHaveLength(2));
      });
    });

    describe('for parsing with quads', () => {
      beforeEach(() => {
        input = Readable.from([ `
          <http://example.org/a> <http://example.org/b> <http://example.org/c>.
          <http://example.org/d> <http://example.org/e> <http://example.org/f> <http://example.org/g>.
      ` ]);
      });

      it('should run on N-Quads', async() => {
        await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/n-quads',
          context,
        })
          .then(async(output: any) => await expect(arrayifyStream(output.handle.data)).resolves.toHaveLength(2));
      });
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({
          mediaTypes: {
            'application/trig': 1,
            'application/n-quads': 0.7,
            'text/turtle': 0.6,
            'application/n-triples': 0.3,
          },
        });
      });
    });
  });
});
