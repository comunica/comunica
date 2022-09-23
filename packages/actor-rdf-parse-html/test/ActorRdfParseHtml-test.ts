import type { Readable } from 'stream';
import { ActorRdfParseHtmlRdfa } from '@comunica/actor-rdf-parse-html-rdfa';
import { ActorRdfParseHtmlScript } from '@comunica/actor-rdf-parse-html-script';
import { ActorRdfParseJsonLd } from '@comunica/actor-rdf-parse-jsonld';
import type { IActionRdfParse, IActorRdfParseOutput } from '@comunica/bus-rdf-parse';
import type { IActionRdfParseHtml, IActorRdfParseHtmlOutput } from '@comunica/bus-rdf-parse-html';
import type { IBus } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ActorRdfParseHtml } from '../lib/ActorRdfParseHtml';

const quad = require('rdf-quad');
const stringToStream = require('streamify-string');

describe('ActorRdfParseHtml', () => {
  let bus: any;
  let context: IActionContext;
  let jsonldParser: ActorRdfParseJsonLd;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
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
      expect(() => { (<any> ActorRdfParseHtml)(); }).toThrow();
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
      input = stringToStream(
        ``,
      );
      inputScript = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`,
      );
      inputScriptError = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e",,,
        }</script>`,
      );
      inputScriptRdfa = stringToStream(
        `<body>
        <p property="dc:title">Title</p>
        <script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>
        </body>`,
      );
      inputSimple = stringToStream(
        `<strong>Hi!</strong>`,
      );
      context = new ActionContext({});
    });

    describe('test', () => {
      it('should return true on text/html', () => {
        return expect(actor.test({ handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'text/html',
          context })).resolves.toBeTruthy();
      });

      it('should reject on application/json', () => {
        return expect(actor.test({ handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/json',
          context })).rejects.toBeTruthy();
      });

      it('should reject on application/ld+json', () => {
        return expect(actor.test({ handle: { data: input, metadata: { baseIRI: '' }, context },
          handleMediaType: 'application/ld+json',
          context })).rejects.toBeTruthy();
      });
    });

    describe('run without html listeners', () => {
      it('should return an empty quad stream', async() => {
        expect(await arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          }))).handle.data))
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
              return Promise.resolve({
                mediaTypes: {
                  'application/ld+json': 1,
                },
              });
            }
            action.data = action.handle.data;
            action.metadata = action.handle.metadata;

            let output: IActorRdfParseOutput | undefined;
            switch (action.handleMediaType) {
              case 'application/ld+json':
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
            }
            return Promise.resolve({ handle: { data: output?.data }});
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
        expect(await arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, metadata: { baseIRI: '' }, context },
            handleMediaType: 'text/html',
          }))).handle.data))
          .toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]);
      });

      it('should return a quad stream (with no metadata provided in input handle)', async() => {
        expect(await arrayifyStream((<any> (await actor
          .run({
            context,
            handle: { data: inputScript, context },
            handleMediaType: 'text/html',
          }))).handle.data))
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
              return Promise.resolve({
                mediaTypes: {
                  'application/ld+json': 1,
                },
              });
            }
            action.data = action.handle.data;
            action.metadata = action.handle.metadata;

            let output: IActorRdfParseOutput | undefined;
            switch (action.handleMediaType) {
              case 'application/ld+json':
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
            }
            return Promise.resolve({ handle: { data: output?.data }});
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
        expect(await arrayifyStream((<any> (await actor.run(
          {
            context,
            handle: { data: inputScriptRdfa, metadata: { baseIRI: 'http://ex.org/' }, context },
            handleMediaType: 'text/html',
          },
        )))
          .handle.data))
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
              onEnd() { throw new Error('ERROR END'); },
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
              onTagClose() { throw new Error('ERROR CLOSE'); },
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
              onTagOpen() { throw new Error('ERROR OPEN'); },
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
              onText() { throw new Error('ERROR TEXT'); },
            },
          }),
        });
      });

      it('should emit an error in the quad stream', async() => {
        await expect(arrayifyStream((<any> (await actor.run({ context,
          handle: { data: inputSimple, metadata: { baseIRI: 'http://ex.org/' }, context },
          handleMediaType: 'text/html' })))
          .handle.data)).rejects.toThrow(new Error('ERROR TEXT'));
      });
    });
  });
});
