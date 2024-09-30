import { PassThrough, Readable } from 'node:stream';
import { KeysRdfParseHtmlScript } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseShaclc } from '../lib/ActorRdfParseShaclc';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

describe('ActorRdfParseShaclc', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('The ActorRdfParseShaclc module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseShaclc).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseShaclc constructor', () => {
      expect(new (<any> ActorRdfParseShaclc)({ name: 'actor', bus, mediaTypePriorities: {}}))
        .toBeInstanceOf(ActorRdfParseShaclc);
    });

    it('should not be able to create new ActorRdfParseShaclc objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseShaclc)();
      }).toThrow(`Class constructor ActorRdfParseShaclc cannot be invoked without 'new'`);
    });

    it('when constructed with optional mediaTypePriorities should set the mediaTypePriorities', () => {
      expect(new ActorRdfParseShaclc(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}},
      ).mediaTypePriorities).toEqual({});
    });

    it('should not throw an error when constructed with optional priorityScale', () => {
      expect(() => {
        new ActorRdfParseShaclc(
          { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
        );
      })
        .toBeTruthy();
    });

    it('when constructed with optional priorityScale should set the priorityScale', () => {
      expect(new ActorRdfParseShaclc(
        { name: 'actor', bus, mediaTypePriorities: {}, mediaTypeFormats: {}, priorityScale: 0.5 },
      ).priorityScale)
        .toBe(0.5);
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

    beforeEach(() => {
      actor = new ActorRdfParseShaclc({ bus, mediaTypePriorities: {
        'text/shaclc': 1,
        'text/shaclc-ext': 0.5,
      }, mediaTypeFormats: {}, name: 'actor' });
      input = Readable.from([ `BASE <http://example.org/basic-shape-iri>
      PREFIX ex: <http://example.org/ex#>

      shape <http://example.org/test#TestShape> {
      }` ]);
    });

    describe('for parsing', () => {
      it('should test on text/shaclc', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'text/shaclc', context }))
          .resolves.toPassTest({ handle: true });
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/shaclc',
            context,
          }))
          .resolves.toPassTest({ handle: true });
      });

      it('should not test on bla+json when processing html', async() => {
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'bla+json',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).resolves.toFailTest(`Unrecognized media type: bla+json`);
      });

      it('should test on text/shaclc when processing html', async() => {
        await expect(actor.test({
          handle: { data: input, context },
          handleMediaType: 'text/shaclc',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).resolves.toPassTest({ handle: true });
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context: new ActionContext({ [KeysRdfParseHtmlScript.processingHtmlScript.name]: true }),
        })).resolves.toPassTest({ handle: true });
      });

      it('should not test on N-Triples', async() => {
        await expect(actor
          .test({ handle: { data: input, context }, handleMediaType: 'application/n-triples', context }))
          .resolves.toFailTest(`Unrecognized media type: application/n-triples`);
        await expect(actor
          .test({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'application/n-triples',
            context,
          }))
          .resolves.toFailTest(`Unrecognized media type: application/n-triples`);
      });

      it('should run', async() => {
        const output: any = await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context,
        });

        const prefixes: Record<string, string> = {};
        output.handle.data.on('prefix', (prefix: string, iri: string) => {
          prefixes[prefix] = iri;
        });

        await expect(arrayifyStream(output.handle.data)).resolves.toEqualRdfQuadArray([
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

    it('should apply the base IRI correctly', async() => {
      const output: any = await actor.run({
        handle: {
          data: Readable.from([ 'shape <#TestShape> {}' ]),
          metadata: { baseIRI: 'https://www.jeswr.org/' },
          context,
        },
        handleMediaType: 'text/shaclc',
        context,
      });

      const prefixes: Record<string, string> = {};
      output.handle.data.on('prefix', (prefix: string, iri: string) => {
        prefixes[prefix] = iri;
      });

      await expect(arrayifyStream(output.handle.data)).resolves.toEqualRdfQuadArray([
        quad(
          'https://www.jeswr.org/#TestShape',
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          'http://www.w3.org/ns/shacl#NodeShape',
        ),
        quad(
          'https://www.jeswr.org/',
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          'http://www.w3.org/2002/07/owl#Ontology',
        ),
      ]);
    });

    describe('for getting media types', () => {
      it('should test', async() => {
        await expect(actor.test({ mediaTypes: true, context })).resolves.toPassTest({ mediaTypes: true });
      });

      it('should run', async() => {
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 1,
          'text/shaclc-ext': 0.5,
        }});
      });

      it('should run with scaled priorities 0.5', async() => {
        actor = new ActorRdfParseShaclc({ bus, mediaTypePriorities: {
          'text/shaclc': 1,
        }, mediaTypeFormats: {}, name: 'actor', priorityScale: 0.5 });
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 0.5,
        }});
      });

      it('should run with scaled priorities 0', async() => {
        actor = new ActorRdfParseShaclc({ bus, mediaTypePriorities: {
          'text/shaclc': 1,
        }, mediaTypeFormats: {}, name: 'actor', priorityScale: 0 });
        await expect(actor.run({ mediaTypes: true, context })).resolves.toEqual({ mediaTypes: {
          'text/shaclc': 0,
        }});
      });

      describe('text/shaclc-ext', () => {
        beforeEach(() => {
          input = Readable.from([ 'BASE <http://example.org/basic-shape-iri>\n' +
          'shape <http://example.org/test#TestShape>;\n' +
          '<http://example.org/p> <http://example.org/p> {\n' +
          '}' ]);
        });

        it('should run on extended syntax with text/shaclc-ext', async() => {
          const output: any = await actor.run({
            handle: { data: input, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/shaclc-ext',
            context,
          });
          await expect(arrayifyStream(output.handle.data)).resolves.toEqualRdfQuadArray([
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
          await expect(() => arrayifyStream(output.handle.data))
            .rejects.toThrow(`Encountered extended SHACLC syntax; but extended parsing is disabled`);
        });
      });

      it('should not have duplicate results on multiple read calls', async() => {
        await actor.run({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/shaclc',
          context,
        })
          .then(async(output: any) => {
            output.handle.data.read();
            output.handle.data.read();
            await expect(arrayifyStream(output.handle.data)).resolves.toEqualRdfQuadArray([
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

      it('should not have duplicate results on multiple read calls (with no metadata)', async() => {
        await actor.run({
          handle: { data: input, context },
          handleMediaType: 'text/shaclc',
          context,
        })
          .then(async(output: any) => {
            output.handle.data.read();
            output.handle.data.read();
            await expect(arrayifyStream(output.handle.data)).resolves.toEqualRdfQuadArray([
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

      it('should be able to pipe data', async() => {
        await actor.run({
          handle: { data: input, context },
          handleMediaType: 'text/shaclc',
          context,
        })
          .then(async(output: any) => {
            // Create a new readable
            const readable = new PassThrough({ objectMode: true });

            output.handle.data.pipe(readable);

            await expect(arrayifyStream(readable)).resolves.toEqualRdfQuadArray([
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
