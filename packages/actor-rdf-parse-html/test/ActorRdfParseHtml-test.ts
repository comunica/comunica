import { Readable } from 'node:stream';
import { ActorRdfParseHtmlRdfa } from '@comunica/actor-rdf-parse-html-rdfa';
import { ActorRdfParseHtmlScript } from '@comunica/actor-rdf-parse-html-script';
import { ActorRdfParseJsonLd } from '@comunica/actor-rdf-parse-jsonld';
import type { IActionRdfParse, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IBus } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfParseHtml } from '../lib/ActorRdfParseHtml';

const quad = require('rdf-quad');

const DF = new DataFactory();

describe('ActorRdfParseHtml', () => {
  let bus: any;
  let context: IActionContext;
  let jsonldParser: ActorRdfParseJsonLd;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    const mediatorHttp: any = null;
    jsonldParser = new ActorRdfParseJsonLd(
      {
        bus,
        mediaTypePriorities: { 'application/json': 0.1, 'application/ld+json': 1 },
        mediaTypeFormats: {},
        name: 'jsonldParser',
        mediatorHttp,
      },
    );
  });

  describe('The ActorRdfParseHtml module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtml).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtml constructor', () => {
      expect(new (<any> ActorRdfParseHtml)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfParseHtml);
    });

    it('should not be able to create new ActorRdfParseHtml objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseHtml)();
      }).toThrow(`Class constructor ActorRdfParseHtml cannot be invoked without 'new'`);
    });
  });

  describe('An ActorRdfParseHtml instance', () => {
    let busRdfParseHtml: IBus<IActionRdfParseHtml, IActorRdfParseHtmlOutput>;
    let mediaTypePriorities;
    let actor: ActorRdfParseHtml;
    let input: Readable;
    let inputScript: Readable;
    let inputScriptError: Readable;
    let inputScriptRdfa: Readable;
    let inputSimple: Readable;

    beforeEach(() => {
      busRdfParseHtml = new Bus({ name: 'busRdfParseHtml' });
      mediaTypePriorities = { 'text/html': 1 };
      actor = new ActorRdfParseHtml(
        { name: 'actor', bus, busRdfParseHtml, mediaTypePriorities, mediaTypeFormats: {}},
      );
      input = Readable.from([
        ``,
      ]);
      inputScript = Readable.from([
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`,
      ]);
      inputScriptError = Readable.from([
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e",,,
        }</script>`,
      ]);
      inputScriptRdfa = Readable.from([
        `<body>
        <p property="dc:title">Title</p>
        <script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>
        </body>`,
      ]);
      inputSimple = Readable.from([
        `<strong>Hi!</strong>`,
      ]);
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    });

    describe('test', () => {
      it('should return true on text/html', async() => {
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/html',
          context,
        })).resolves.toBeTruthy();
      });

      it('should reject on application/json', async() => {
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/json',
          context,
        })).rejects.toEqual(new Error('Unrecognized media type: application/json'));
      });

      it('should reject on application/ld+json', async() => {
        await expect(actor.test({
          handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/ld+json',
          context,
        })).rejects.toEqual(new Error('Unrecognized media type: application/ld+json'));
      });
    });

    describe('run without html listeners', () => {
      it('should return an empty quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          }))).handle.data)).resolves
          .toEqualRdfQuadArray([]);
      });
    });

    describe('run with a html script listener', () => {
      let mediator: any;

      beforeEach(() => {
        mediator = {
          async mediate(
            action: { handle: IActionRdfParse; mediaTypes: boolean; handleMediaType: string } & IActionRdfParse,
          ) {
            if (action.mediaTypes) {
              return {
                mediaTypes: {
                  'application/ld+json': 1,
                },
              };
            }
            action.data = action.handle.data;
            action.metadata = action.handle.metadata;

            let output: IActorRdfParseOutput | undefined;
            switch (action.handleMediaType) {
              case 'application/ld+json':
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
            }
            return { handle: { data: output?.data }};
          },
        };

        new ActorRdfParseHtmlScript({
          bus: busRdfParseHtml,
          mediatorRdfParseHandle: mediator,
          mediatorRdfParseMediatypes: mediator,
          name: 'actor',
        });
      });

      it('should return a quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          }))).handle.data)).resolves
          .toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]);
      });

      it('should return a quad stream (with no metadata provided in input handle)', async() => {
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, context },
            handleMediaType: 'text/html',
          }))).handle.data)).resolves
          .toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]);
      });

      it('should delegate error events', async() => {
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScriptError, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          })))
          .handle.data))
          .rejects.toThrow(new Error('Unexpected COMMA(",") in state KEY'));
      });

      it('should delegate error events (with no metadata provided in input handle)', async() => {
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScriptError, context },
            handleMediaType: 'text/html',
          })))
          .handle.data))
          .rejects.toThrow(new Error('Unexpected COMMA(",") in state KEY'));
      });

      it('should produce an error in the stream if there is an error getting html parsers', async() => {
        (<any>actor).busRdfParseHtml.publish = () => [ Promise.reject(new Error('boo')), Promise.resolve() ];
        const readable = new Readable();
        readable._read = () => {
          // Do nothing
        };
        await expect(arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: readable, context },
            handleMediaType: 'text/html',
          })))
          .handle.data))
          .rejects.toThrow(new Error('boo'));
      });

      it('should allow multiple reads', async() => {
        const quads = (<any> (await actor.run(
          {
            context,
            handle: { data: inputScript, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          },
        ))).handle.data;
        quads._read();
        quads._read();
      });
    });

    describe('run with a html script and rdfa listener', () => {
      let mediator: any;

      beforeEach(() => {
        mediator = {
          async mediate(action: any) {
            if (action.mediaTypes === true) {
              return {
                mediaTypes: {
                  'application/ld+json': 1,
                },
              };
            }
            action.data = action.handle.data;
            action.metadata = action.handle.metadata;

            let output: IActorRdfParseOutput | undefined;
            switch (action.handleMediaType) {
              case 'application/ld+json':
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
            }
            return { handle: { data: output?.data }};
          },
        };

        new ActorRdfParseHtmlScript({
          bus: busRdfParseHtml,
          mediatorRdfParseHandle: mediator,
          mediatorRdfParseMediatypes: mediator,
          name: 'actor1',
        });
        new ActorRdfParseHtmlRdfa({
          bus: busRdfParseHtml,
          name: 'actor2',
        });
      });

      it('should return a quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run(
          {
            context,
            handle: { data: inputScriptRdfa, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'text/html',
          },
        )))
          .handle.data)).resolves
          .toEqualRdfQuadArray([
            quad('http://ex.org/', 'http://purl.org/dc/terms/title', '"Title"'),
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]);
      });
    });

    describe('run with a listener error on end', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd() {
                throw new Error('ERROR END');
              },
              onTagClose() {
                // Do nothing
              },
              onTagOpen() {
                // Do nothing
              },
              onText() {
                // Do nothing
              },
            },
          }),
        });
      });

      it('should emit an error in the quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run(
          {
            context,
            handle: { data: inputSimple, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'text/html',
          },
        )))
          .handle.data)).rejects.toThrow(new Error('ERROR END'));
      });
    });

    describe('run with a listener error on close tag', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd() {
                // Do nothing
              },
              onTagClose() {
                throw new Error('ERROR CLOSE');
              },
              onTagOpen() {
                // Do nothing
              },
              onText() {
                // Do nothing
              },
            },
          }),
        });
      });

      it('should emit an error in the quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run(
          {
            context,
            handle: { data: inputSimple, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'text/html',
          },
        )))
          .handle.data)).rejects.toThrow(new Error('ERROR CLOSE'));
      });
    });

    describe('run with a listener error on open tag', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd() {
                // Do nothing
              },
              onTagClose() {
                // Do nothing
              },
              onTagOpen() {
                throw new Error('ERROR OPEN');
              },
              onText() {
                // Do nothing
              },
            },
          }),
        });
      });

      it('should emit an error in the quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run({
          context,
          handle: { data: inputSimple, metadata: { baseIRI: 'http://ex.org/' }, context },
          handleMediaType: 'text/html',
        })))
          .handle.data)).rejects.toThrow(new Error('ERROR OPEN'));
      });
    });

    describe('run with a listener error on text', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd() {
                // Do nothing
              },
              onTagClose() {
                // Do nothing
              },
              onTagOpen() {
                // Do nothing
              },
              onText() {
                throw new Error('ERROR TEXT');
              },
            },
          }),
        });
      });

      it('should emit an error in the quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run({ context, handle: { data: inputSimple, metadata: { baseIRI: 'http://ex.org/' }, context }, handleMediaType: 'text/html' })))
          .handle.data)).rejects.toThrow(new Error('ERROR TEXT'));
      });
    });
  });
});
