import {ActorRdfParseHtmlRdfa} from "@comunica/actor-rdf-parse-html-rdfa";
import {ActorRdfParseHtmlScript} from "@comunica/actor-rdf-parse-html-script";
import {ActorRdfParseJsonLd} from "@comunica/actor-rdf-parse-jsonld";
import {IActionRdfParseHtml, IActorRdfParseHtmlOutput} from "@comunica/bus-rdf-parse-html";
import {ActionContext, Actor, Bus, IActorTest} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseHtml} from "../lib/ActorRdfParseHtml";

const stringToStream = require('streamify-string');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorRdfParseHtml', () => {
  let bus;
  let jsonldParser: ActorRdfParseJsonLd;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    const mediatorHttp = null;
    jsonldParser = new ActorRdfParseJsonLd(
      { bus, mediaTypes: {'application/json': 0.1, 'application/ld+json': 1.0 }, name: 'jsonldParser', mediatorHttp });
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
    let busRdfParseHtml: Bus<Actor<IActionRdfParseHtml, IActorTest,
      IActorRdfParseHtmlOutput>, IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput>;
    let mediaTypes;
    let actor: ActorRdfParseHtml;
    let input: Readable;
    let inputScript: Readable;
    let inputScriptError: Readable;
    let inputScriptRdfa: Readable;
    let inputSimple: Readable;
    let context;

    beforeEach(() => {
      busRdfParseHtml = new Bus({ name: 'busRdfParseHtml' });
      mediaTypes = { 'text/html': 1.0 };
      actor = new ActorRdfParseHtml({ name: 'actor', bus, busRdfParseHtml, mediaTypes });
      input = stringToStream(
        ``);
      inputScript = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`);
      inputScriptError = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e",,,
        }</script>`);
      inputScriptRdfa = stringToStream(
        `<body>
        <p property="dc:title">Title</p>
        <script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>
        </body>`);
      inputSimple = stringToStream(
        `<strong>Hi!</strong>`);
      context = ActionContext({});
    });

    describe('test', () => {
      it('should return true on text/html', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'text/html' })).resolves.toBeTruthy();
      });

      it('should reject on application/json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'application/json' })).rejects.toBeTruthy();
      });

      it('should reject on application/ld+json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'application/ld+json' })).rejects.toBeTruthy();
      });
    });

    describe('run without html listeners', () => {
      it('should return an empty quad stream', async () => {
        return expect(await arrayifyStream((await actor
          .run({ context, handle: { input: inputScript, baseIRI: '' }, handleMediaType: 'text/html' })).handle.quads))
          .toEqualRdfQuadArray([]);
      });
    });

    describe('run with a html script listener', () => {
      let mediator;

      beforeEach(() => {
        mediator = {
          mediate: async (action) => {
            if (action.mediaTypes === true) {
              return Promise.resolve({
                mediaTypes: {
                  "application/ld+json": 1,
                },
              });
            } else {
              action.input = action.handle.input;
              action.baseIRI = action.handle.baseIRI;

              let output;
              switch (action.handleMediaType) {
              case "application/ld+json":
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
              }
              return Promise.resolve({ handle: { quads: output.quads } });
            }
          },
        };

        new ActorRdfParseHtmlScript({
          bus: busRdfParseHtml,
          mediatorRdfParseHandle: mediator,
          mediatorRdfParseMediatypes: mediator,
          name: 'actor',
        });
      });

      it('should return a quad stream', async () => {
        return expect(await arrayifyStream((await actor
          .run({ context, handle: { input: inputScript, baseIRI: '' }, handleMediaType: 'text/html' })).handle.quads))
          .toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]);
      });

      it('should delegate error events', async () => {
        return expect(arrayifyStream((await actor
          .run({ context, handle: { input: inputScriptError, baseIRI: '' }, handleMediaType: 'text/html' }))
          .handle.quads))
          .rejects.toThrow(new Error('Unexpected COMMA(",") in state KEY'));
      });
    });

    describe('run with a html script and rdfa listener', () => {
      let mediator;

      beforeEach(() => {
        mediator = {
          mediate: async (action) => {
            if (action.mediaTypes === true) {
              return Promise.resolve({
                mediaTypes: {
                  "application/ld+json": 1,
                },
              });
            } else {
              action.input = action.handle.input;
              action.baseIRI = action.handle.baseIRI;

              let output;
              switch (action.handleMediaType) {
              case "application/ld+json":
                output = await jsonldParser.runHandle(action, action.handleMediaType, context);
                break;
              }
              return Promise.resolve({ handle: { quads: output.quads } });
            }
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

      it('should return a quad stream', async () => {
        return expect(await arrayifyStream((await actor.run(
          { context, handle: { input: inputScriptRdfa, baseIRI: 'http://ex.org/' }, handleMediaType: 'text/html' }))
          .handle.quads))
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
              onEnd: () => { throw new Error('ERROR END'); },
              onTagClose: () => { return; },
              onTagOpen: () => { return; },
              onText: () => { return; },
            }
          }),
        });
      });

      it('should emit an error in the quad stream', async () => {
        return expect(arrayifyStream((await actor.run(
          { context, handle: { input: inputSimple, baseIRI: 'http://ex.org/' }, handleMediaType: 'text/html' }))
          .handle.quads)).rejects.toThrow(new Error('ERROR END'));
      });
    });

    describe('run with a listener error on close tag', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd: () => { return; },
              onTagClose: () => { throw new Error('ERROR CLOSE'); },
              onTagOpen: () => { return; },
              onText: () => { return; },
            }
          }),
        });
      });

      it('should emit an error in the quad stream', async () => {
        return expect(arrayifyStream((await actor.run(
          { context, handle: { input: inputSimple, baseIRI: 'http://ex.org/' }, handleMediaType: 'text/html' }))
          .handle.quads)).rejects.toThrow(new Error('ERROR CLOSE'));
      });
    });

    describe('run with a listener error on open tag', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd: () => { return; },
              onTagClose: () => { return; },
              onTagOpen: () => { throw new Error('ERROR OPEN'); },
              onText: () => { return; },
            }
          }),
        });
      });

      it('should emit an error in the quad stream', async () => {
        return expect(arrayifyStream((await actor.run(
          { context, handle: { input: inputSimple, baseIRI: 'http://ex.org/' }, handleMediaType: 'text/html' }))
          .handle.quads)).rejects.toThrow(new Error('ERROR OPEN'));
      });
    });

    describe('run with a listener error on text', () => {
      beforeEach(() => {
        busRdfParseHtml.subscribe(<any> {
          test: () => true,
          run: () => ({
            htmlParseListener: {
              onEnd: () => { return; },
              onTagClose: () => { return; },
              onTagOpen: () => { return; },
              onText: () => { throw new Error('ERROR TEXT'); },
            }
          }),
        });
      });

      it('should emit an error in the quad stream', async () => {
        return expect(arrayifyStream((await actor.run(
          { context, handle: { input: inputSimple, baseIRI: 'http://ex.org/' }, handleMediaType: 'text/html' }))
          .handle.quads)).rejects.toThrow(new Error('ERROR TEXT'));
      });
    });
  });
});
