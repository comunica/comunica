import { Readable } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
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
      expect(() => { (<any> ActorRdfSerializeShaclc)(); }).toThrow();
    });
  });

  describe('An ActorRdfSerializeShaclc instance', () => {
    let actor: ActorRdfSerializeShaclc;
    let quadStream: any;
    let quadsError: any;

    beforeEach(() => {
      actor = new ActorRdfSerializeShaclc({ bus,
        mediaTypePriorities: {
          'text/shaclc': 1,
        },
        mediaTypeFormats: {},
        name: 'actor' });
    });

    describe('for serializing', () => {
      beforeEach(() => {
        quadStream = new ArrayIterator([
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

      it('should test on text/shaclc', () => {
        return expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context }))
          .resolves.toBeTruthy();
      });

      it('should not test on application/trig', () => {
        return expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'application/trig', context }))
          .rejects.toBeTruthy();
      });

      it('should not test on text/turtle', () => {
        return expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'text/turtle', context }))
          .rejects.toBeTruthy();
      });

      it('should not test on application/json', () => {
        return expect(actor.test({ handle: { quadStream, context }, handleMediaType: 'application/json', context }))
          .rejects.toBeTruthy();
      });

      it('should run', async() => {
        const output: any = await actor
          .run({ handle: { quadStream, context }, handleMediaType: 'text/shaclc', context });
        expect(await stringifyStream(output.handle.data)).toEqual(
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
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 1,
        }});
      });
    });
  });
});
