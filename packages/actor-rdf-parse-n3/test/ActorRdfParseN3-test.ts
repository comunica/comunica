import { Readable } from 'stream';
import { ActorRdfParseFixedMediaTypes } from '@comunica/bus-rdf-parse';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseN3 } from '../lib/ActorRdfParseN3';

const stringToStream = require('streamify-string');

describe('ActorRdfParseN3', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfParseN3 module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseN3).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseN3 constructor', () => {
      expect(new (<any>ActorRdfParseN3)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseN3);
      expect(new (<any>ActorRdfParseN3)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseN3 objects without \'new\'', () => {
      expect(() => { (<any>ActorRdfParseN3)(); }).toThrow();
    });

    it('should not throw an error when constructed with required arguments', () => {
      expect(() => {
        new ActorRdfParseN3(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
        );
      }).toBeTruthy();
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseN3(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => {
        new ActorRdfParseN3(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
      }).toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseN3(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseN3(
        { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
      )
        .mediaTypePriorities).toEqual({
        A: 1,
        B: 0.5,
        C: 0,
      });
    });

    it('should not throw an error when constructed with optional arguments', () => {
      expect(() => {
        new ActorRdfParseN3(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
      }).toBeTruthy();
    });
  });

  describe('An ActorRdfParseN3 instance', () => {
    let actor: ActorRdfParseN3;
    let input: Readable;
    let inputError: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseN3({
        bus,
        mediaTypePriorities: {
          'application/trig': 1,
          'application/n-quads': 0.7,
          'text/turtle': 0.6,
          'application/n-triples': 0.3,
          'text/n3': 0.2,
        },
        mediaTypeFormats: {},
        name: 'actor',
      });
    });

    describe('for parsing n3', () => {
      beforeEach(() => {
        input = stringToStream(`
        { ?uuu ?aaa ?yyy } => { ?aaa a <http://www.w3.org/1999/02/22-rdf-syntax-ns#Property> } .
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error('ParseN3'));
      });

      it('should test on N3', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/n3', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/n3',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should parse N3', async() => {
        const output: any = await actor.run({ handle: { data: input, context }, handleMediaType: 'text/n3', context });
        const arr = await arrayifyStream(output.handle.data);
        expect(arr).toHaveLength(3);
      });
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`
          <a> <b> <c>.
          <d> <e> <f>.
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error('ParseN3'));
      });

      it('should test on TriG', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/trig', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/trig',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should test on N-Quads', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-quads', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-quads',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should test on Turtle', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/turtle', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/turtle',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should test on N-Triples', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-triples', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-triples',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should not test on JSON-LD', async() => {
        await expect(actor
          .test({
            handle: { data: input, context },
            handleMediaType: 'application/ld+json',
            context,
          }))
          .rejects.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/ld+json',
            context,
          }))
          .rejects.toBeTruthy();
      });

      it('should run on text/turtle', () => {
        return actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/turtle',
          context,
        })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toHaveLength(2));
      });

      it('should run on application/trig', () => {
        return actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/trig',
          context,
        })
          .then(async(output: any) => expect(await arrayifyStream(output.handle.data)).toHaveLength(2));
      });

      it('should forward stream errors', async() => {
        await expect(arrayifyStream((<any>(await actor.run(
          { handle: { data: inputError, context }, handleMediaType: 'application/trig', context },
        )))
          .handle.data)).rejects.toBeTruthy();
      });

      it('should forward stream errors (with no metadata in input handle)', async() => {
        await expect(arrayifyStream((<any>(await actor.run({
          handle: { data: inputError, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/trig',
          context,
        })))
          .handle.data)).rejects.toBeTruthy();
      });
    });

    describe('for parsing with quads', () => {
      beforeEach(() => {
        input = stringToStream(`
          <a> <b> <c>.
          <d> <e> <f> <g>.
      `);
        inputError = new Readable();
        inputError._read = () => inputError.emit('error', new Error('ParseN3'));
      });

      it('should test on N-Quads', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-quads', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-quads',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should test on Turtle', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/turtle', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/turtle',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should test on N-Triples', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-triples', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-triples',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should not test on JSON-LD', async() => {
        await expect(actor
          .test({
            handle: { data: input, context },
            handleMediaType: 'application/ld+json',
            context,
          }))
          .rejects.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/ld+json',
            context,
          }))
          .rejects.toBeTruthy();
      });

      it('should forward stream errors', async() => {
        await expect(arrayifyStream((<any>(await actor.run(
          { handle: { data: inputError, context }, handleMediaType: 'application/trig', context },
        )))
          .handle.data)).rejects.toBeTruthy();
      });

      it('should forward stream errors (with no metadata in input handle)', async() => {
        await expect(arrayifyStream((<any>(await actor.run({
          handle: { data: inputError, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/trig',
          context,
        })))
          .handle.data)).rejects.toBeTruthy();
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({
          mediaTypes: {
            'application/trig': 1,
            'application/n-quads': 0.7,
            'text/turtle': 0.6,
            'application/n-triples': 0.3,
            'text/n3': 0.2,
          },
        });
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseN3(
          { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({
          mediaTypes: {
            A: 1,
            B: 0.5,
            C: 0,
          },
        });
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseN3(
          { name: 'actor', bus, mediaTypePriorities: { A: 2, B: 1, C: 0 }, mediaTypeFormats: {}, priorityScale: 0 },
        );
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({
          mediaTypes: {
            A: 0,
            B: 0,
            C: 0,
          },
        });
      });
    });
  });
});
