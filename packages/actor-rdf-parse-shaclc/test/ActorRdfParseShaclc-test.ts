import type { Readable } from 'stream';
import { KeysRdfParseHtmlScript } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseShaclc } from '../lib/ActorRdfParseShaclc';

const quad = require('rdf-quad');
const streamifyString = require('streamify-string');

describe('ActorRdfParseShaclc', () => {
  let bus: any;
  let mediatorHttp: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorHttp = {
      mediate(args: any) {
        // Error
        if (args.input.includes('error')) {
          return Promise.resolve({
            ok: false,
            statusText: 'some error',
            status: 500,
            headers: new Headers({}),
          });
        }

        return Promise.resolve({
          body: streamifyString(`BASE <http://example.org/basic-shape-iri>

          shape <http://example.org/test#TestShape> {
          }`),
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'text/shaclc' }),
        });
      },
    };
    context = new ActionContext();
  });

  describe('The ActorRdfParseShaclc module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseShaclc).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseShaclc constructor', () => {
      expect(new (<any> ActorRdfParseShaclc)({ name: 'actor', bus, mediaTypePriorities: {}, mediatorHttp }))
        .toBeInstanceOf(ActorRdfParseShaclc);
    });

    it('should not be able to create new ActorRdfParseShaclc objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseShaclc)(); }).toThrow();
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseShaclc(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => { new ActorRdfParseShaclc(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ); })
        .toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseShaclc(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toEqual(0.5);
    });

    it('when constructed with optional priorityScale should scale the priorities', () => {
      expect(new ActorRdfParseShaclc(
        {
          name: 'actor',
          bus,
          mediaTypePriorities: { A: 2, B: 1, C: 0 },
          mediaTypeFormats: {},
          priorityScale: 0.5,
        },
      )
        .mediaTypePriorities).toEqual({
        A: 1,
        B: 0.5,
        C: 0,
      });
    });
  });

  describe('An ActorRdfParseShaclc instance', () => {
    let actor: ActorRdfParseShaclc;
    let input: Readable;
    // Let inputGraphs: Readable;
    let inputLinkHeader: Readable;
    let inputSkipped: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseShaclc({ bus,
        mediaTypePriorities: {
          'text/shaclc': 1,
          'text/shaclc-ext': 0.5,
        },
        mediaTypeFormats: {},
        name: 'actor' });
      input = streamifyString(`BASE <http://example.org/basic-shape-iri>
      PREFIX ex: <http://example.org/ex#>

      shape <http://example.org/test#TestShape> {
      }`);
    });

    describe('for parsing', () => {
      beforeEach(() => {
        inputLinkHeader = streamifyString(`{
          "@id": "http://www.example.org/",
          "term": "value"
        }`);
        inputSkipped = streamifyString(`{
          "@id": "http://www.example.org/",
          "skipped": "value"
        }`);
      });

      it('should test on text/shaclc', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/shaclc', context }))
          .resolves.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/shaclc',
            context,
          }))
          .resolves.toBeTruthy();
      });

      it('should not test on bla+json when processing html', () => {
        return expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'bla+json',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).rejects.toBeTruthy();
      });

      it('should test on text/shaclc when processing html', async() => {
        await expect(actor.test({
          handle: { data: input, context },
          handleMediaType: 'text/shaclc',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).resolves.toBeTruthy();
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).resolves.toBeTruthy();
      });

      it('should not test on N-Triples', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-triples', context }))
          .rejects.toBeTruthy();
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-triples',
            context,
          }))
          .rejects.toBeTruthy();
      });

      it('should run', async() => {
        const output: any = await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context,
        });

        const prefixes: Record<string, string> = {};
        output.handle.data.on('prefix', (prefix: string, iri: string) => { prefixes[prefix] = iri; });

        expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
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

        expect(prefixes).toEqual({
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
          sh: 'http://www.w3.org/ns/shacl#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          ex: 'http://example.org/ex#',
        });
      });
    });

    describe('for getting media types', () => {
      it('should test', () => {
        return expect(actor.test({ mediaTypes: true, context })).resolves.toBeTruthy();
      });

      it('should run', () => {
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 1,
          'text/shaclc-ext': 0.5,
        }});
      });

      it('should run with scaled priorities 0.5', () => {
        actor = new ActorRdfParseShaclc({ bus,
          mediaTypePriorities: {
            'text/shaclc': 1,
          },
          mediaTypeFormats: {},
          name: 'actor',
          priorityScale: 0.5 });
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 0.5,
        }});
      });

      it('should run with scaled priorities 0', () => {
        actor = new ActorRdfParseShaclc({ bus,
          mediaTypePriorities: {
            'text/shaclc': 1,
          },
          mediaTypeFormats: {},
          name: 'actor',
          priorityScale: 0 });
        return expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 0,
        }});
      });

      describe('text/shaclc-ext', () => {
        beforeEach(() => {
          input = streamifyString('BASE <http://example.org/basic-shape-iri>\n' +
          'shape <http://example.org/test#TestShape>;\n' +
          '<http://example.org/p> <http://example.org/p> {\n' +
          '}');
        });

        it('should run on extended syntax with text/shaclc-ext', async() => {
          const output: any = await actor.run({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/shaclc-ext',
            context,
          });
          expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
            quad(
              'http://example.org/test#TestShape',
              'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              'http://www.w3.org/ns/shacl#NodeShape',
            ),
            quad(
              'http://example.org/test#TestShape',
              'http://example.org/p',
              'http://example.org/p',
            ),
            quad(
              'http://example.org/basic-shape-iri',
              'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              'http://www.w3.org/2002/07/owl#Ontology',
            ),
          ]);
        });

        it('should reject on extended syntax with text/shaclc mediatype', async() => {
          const output: any = await actor.run({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/shaclc',
            context,
          });
          await expect(() => arrayifyStream(output.handle.data)).rejects.toThrowError();
        });
      });

      it('should not have duplicate results on multiple read calls', () => {
        return actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context,
        })
          .then(async(output: any) => {
            output.handle.data.read();
            output.handle.data.read();
            expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
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
          });
      });

      it('should not have duplicate results on multiple read calls (with no metadata)', () => {
        return actor.run({
          handle: { data: input, context },
          handleMediaType: 'text/shaclc',
          context,
        })
          .then(async(output: any) => {
            output.handle.data.read();
            output.handle.data.read();
            expect(await arrayifyStream(output.handle.data)).toEqualRdfQuadArray([
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
          });
      });
    });
  });
});
