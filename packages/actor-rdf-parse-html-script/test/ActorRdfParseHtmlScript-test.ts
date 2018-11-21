import {
  ActorRdfParseFixedMediaTypes,
  IActionRdfParse,
} from "@comunica/bus-rdf-parse";
import {ActionContext, Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseHtmlScript} from "../lib/ActorRdfParseHtmlScript";

const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');
const stringToStream = require('streamify-string');
const streamifyArray = require('streamify-array');

describe('ActorRdfParseHtml', () => {
  let bus;
  let mediator;
  let context;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediator = {
      mediate: (action) => {

        if (action.mediaTypes === true) {
          return Promise.resolve({ mediaTypes: {
            "application/ld+json": 1,
            "application/n-quads": 2,
            "application/n-triples": 3,
            "application/trig": 4,
            "text/n3": 5,
            "text/turtle": 6,
          } });
        } else {
          return Promise.resolve({ handle: { quads: streamifyArray([
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
          ]) }});
        }

      },
    };

    context = ActionContext({ '@comunica/bus-rdf-parse:source':
          { type: 'handle', value: 'myValue' },
    });
  });

  describe('The ActorRdfParseHtmlScript module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtmlScript).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtmlScript constructor', () => {
      expect(new (<any> ActorRdfParseHtmlScript)({name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseHtmlScript);
      expect(new (<any> ActorRdfParseHtmlScript)({name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseHtml objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseHtmlScript)();
      }).toThrow();
    });
  });

  describe('An ActorRdfParseHtmlScript instance', () => {
    let actor: ActorRdfParseHtmlScript;
    const  input: Readable = stringToStream(
      `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`);

    const parseAction: IActionRdfParse = {
      context,
      input,
    };

    beforeEach(() => {
      actor = new ActorRdfParseHtmlScript({ name: 'actor', bus, mediaTypes: { 'text/html': 1.0 } });
      actor.mediatorRdfParse = mediator;
      parseAction.context = context;
      parseAction.input = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`);
    });

    describe('for parsing', () => {

      it('should test on text/html', () => {
        return expect(actor.test({ handle: { input: parseAction.input },
          handleMediaType: 'text/html' })).resolves.toBeTruthy();
      });

      it('should not test on application/json', () => {
        return expect(actor.test({ handle: { input: parseAction.input },
          handleMediaType: 'application/json' })).rejects.toBeTruthy();
      });

      it('should not test on application/ld+json', () => {
        return expect(actor.test({ handle: { input: parseAction.input },
          handleMediaType: 'application/ld+json' })).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({ context, handle: { input: parseAction.input }, handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
          ]));
      });

      it('should run with wrong script type but no output', () => {
        parseAction.input = stringToStream(
          `<script type="text/plain">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
          }</script>`);

        return actor.run(
          { context: parseAction.context, handle: { input: parseAction.input }, handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([]));
      });

      it('should run with two JSON-LD scripts', () => {
        parseAction.input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>
          <script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>`);

        return actor.run(
          { context: parseAction.context, handle: { input: parseAction.input }, handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
          ]));
      });

      it('should run with one JSON-LD script and one text/plain script', () => {
        parseAction.input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>
          <script type="text/plain">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>`);

        return actor.run(
          { context: parseAction.context, handle: { input: parseAction.input }, handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
          ]));
      });

      it('should run with two JSON-LD scripts and one N-Quads script', () => {
        parseAction.input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>
          <script type="application/n-quads">
            http://example.org/a http://example.org/b http://example.org/c "" .
            http://example.org/a http://example.org/d http://example.org/e "" .
          </script>
          <script type="application/ld+json">
            [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
            }]
          </script>`);

        return actor.run(
          { context: parseAction.context, handle: { input: parseAction.input }, handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad("http://example.org/a", "http://example.org/b", "http://example.org/c", ""),
            quad("http://example.org/a", "http://example.org/d", "http://example.org/e", ""),
            quad("http://example.org/a", "http://example.org/b", "http://example.org/c", ""),
            quad("http://example.org/a", "http://example.org/d", "http://example.org/e", ""),
            quad("http://example.org/a", "http://example.org/b", "http://example.org/c", ""),
            quad("http://example.org/a", "http://example.org/d", "http://example.org/e", ""),
          ]));
      });

    });
  });
});
