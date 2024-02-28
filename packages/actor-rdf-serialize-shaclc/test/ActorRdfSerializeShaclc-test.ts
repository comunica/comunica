import { Readable } from 'node:stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { union, fromArray } from 'asynciterator';
import { ActorRdfSerializeShaclc } from '../lib/ActorRdfSerializeShaclc';

const quad = require('rdf-quad');
const stringifyStream = require('stream-to-string');

describe('ActorRdfSerializeShaclc', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfSerializeShaclc module', () => {
    it('should be a function', () => {
      expect(ActorRdfSerializeShaclc).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSerializeShaclc constructor', () => {
      expect(new (<any> ActorRdfSerializeShaclc)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfSerializeShaclc);
    });

    it('should not be able to create new ActorRdfSerializeShaclc objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfSerializeShaclc)();
      }).toThrow(`Class constructor ActorRdfSerializeShaclc cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfSerializeShaclc instance', () => {
    let actor: ActorRdfSerializeShaclc;
    let quadStream: any;
    let quadsError: any;

    beforeEach(() => {
      actor = new ActorRdfSerializeShaclc({ bus, mediaTypePriorities: {
        'text/shaclc': 1,
        'text/shaclc-ext': 0.5,
      }, mediaTypeFormats: {}, name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quadStream = fromArray([
          quad(
            'http://example.org/test#TestShape',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            'http://www.w3.org/ns/shacl#NodeShape',
          ),
          quad(
            'http://example.org/basic-shape-iri',
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            'http://www.w3.org/2002/07/owl#Ontology',
          ),
        ]);
        quadsError = new Readable();
        quadsError._read = () => quadsError.emit('error', new Error('SerializeShaclc'));
      });

      describe('should test', () => {
        afterEach(() => {
          quadStream.destroy();
        });

        it('should test on text/shaclc', async() => {
          await expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context }))
            .resolves.toBeTruthy();
        });

        it('should test on text/shaclc-ext', async() => {
          await expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'text/shaclc-ext', context }))
            .resolves.toBeTruthy();
        });

        it('should not test on application/trig', async() => {
          await expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'application/trig', context }))
            .rejects.toBeTruthy();
        });

        it('should not test on text/turtle', async() => {
          await expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'text/turtle', context }))
            .rejects.toBeTruthy();
        });

        it('should not test on application/json', async() => {
          await expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'application/json', context }))
            .rejects.toBeTruthy();
        });
      });

      it('should run', async() => {
        const output: any = await actor
          .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context });
        await expect(stringifyStream(output.handle.data)).resolves.toEqual(
          'BASE <http://example.org/basic-shape-iri>\n\n' +
          'shape <http://example.org/test#TestShape> {\n' +
          '}\n',
        );
      });

      it('should include prefixes when the prefix event occurs', async() => {
        let first = false;
        quadStream = quadStream.map((elem: any) => {
          if (!first) {
            quadStream.emit('prefix', 'ext', 'http://example.org/test#');
            first = true;
          }
          return elem;
        });

        const output: any = await actor
          .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context });
        await expect(stringifyStream(output.handle.data)).resolves.toEqual(
          'BASE <http://example.org/basic-shape-iri>\n' +
          'PREFIX ext: <http://example.org/test#>\n\n' +
          'shape ext:TestShape {\n' +
          '}\n',
        );
      });

      describe('text/shaclc-ext', () => {
        beforeEach(() => {
          quadStream = union([ quadStream, fromArray([ quad(
            'http://example.org/test#TestShape',
            'http://example.org/p',
            'http://example.org/p',
          ) ]) ]);
        });

        it('should reject on extended syntax with text/shaclc mediatype', async() => {
          const output: any = await actor
            .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context });
          await expect(stringifyStream(output.handle.data))
            .rejects.toThrow(`Dataset contains quads that cannot be written in SHACLC`);
        });

        it('should run on extended syntax with text/shaclc-ext', async() => {
          const output: any = await actor
            .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc-ext', context });
          expect((await stringifyStream(output.handle.data)).replaceAll(/([\t\n ])/ug, '')).toEqual(
            'BASE<http://example.org/basic-shape-iri>' +
          'shape<http://example.org/test#TestShape>;' +
          '<http://example.org/p><http://example.org/p>{' +
          '}',
          );
        });
      });

      it('should run and return correct output even after multiple _read() calls', async() => {
        const output: any = await actor
          .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context });

        expect(output.handle.data._read()).toBeUndefined();
        expect(output.handle.data._read()).toBeUndefined();

        await expect(stringifyStream(output.handle.data)).resolves.toEqual(
          'BASE <http://example.org/basic-shape-iri>\n\n' +
          'shape <http://example.org/test#TestShape> {\n' +
          '}\n',
        );
      });

      it('should run and output triples for text/turtle', async() => {
        expect((<any> (await actor.run({ handle: { quadStream, context }, handleMediaType: 'text/turtle', context })))
          .handle.triples).toBeTruthy();
      });

      it('should forward stream errors', async() => {
        await expect(stringifyStream((<any> (await actor.run(
          { handle: { quadStream: quadsError, context }, handleMediaType: 'application/trig', context },
        )))
          .handle.data)).rejects.toBeTruthy();

        // Close the quadStream since we didn't use it
        quadStream.destroy();
      });
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 1,
          'text/shaclc-ext': 0.5,
        }});
      });
    });
  });
});
