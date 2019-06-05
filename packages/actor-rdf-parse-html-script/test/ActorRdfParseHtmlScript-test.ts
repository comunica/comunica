import {ActorRdfParseJsonLd} from "@comunica/actor-rdf-parse-jsonld";
import {ActorRdfParseN3} from "@comunica/actor-rdf-parse-n3";
import {ActorRdfParseRdfXml} from "@comunica/actor-rdf-parse-rdfxml";
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

  let jsonldParser: ActorRdfParseJsonLd;
  let n3Parser: ActorRdfParseN3;
  let rdfxmlParser: ActorRdfParseRdfXml;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    jsonldParser = new ActorRdfParseJsonLd(
      { bus, mediaTypes:
      {
        'application/json': 0.1,
        'application/ld+json': 1.0,
      },
        name: 'jsonldParser',
      });
    n3Parser = new ActorRdfParseN3(
      { bus, mediaTypes:
      {
        'application/n-quads': 0.7,
        'application/n-triples': 0.3,
        'application/trig': 1.0,
        'text/n3': 0.2,
        'text/turtle': 0.6,
      },
        name: 'n3Parser',
      });
    rdfxmlParser = new ActorRdfParseRdfXml(
      { name: 'rdfxmlParser', bus, mediaTypes: { 'application/rdf+xml': 1.0 } });

    mediator = {
      mediate: async (action) => {
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
          action.input = action.handle.input;

          let output;
          switch (action.handleMediaType) {
          case "application/n-quads":
          case "application/n-triples":
          case "application/trig":
          case "text/n3":
          case "text/turtle":
            output = await n3Parser.runHandle(action, action.handleMediaType, context);
            break;
          case "application/ld+json":
          case "application/json":
            output = await jsonldParser.runHandle(action, action.handleMediaType, context);
            break;
          case "application/rdf+xml":
            output = await rdfxmlParser.runHandle(action, action.handleMediaType, context);
            break;
          }

          return Promise.resolve({ handle: { quads: output.quads } });
        }
      },
    };

    context = ActionContext;
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
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseHtmlScript({ name: 'actor', bus, mediaTypes: { 'text/html': 1.0 } });
      actor.mediatorRdfParse = mediator;
      input = stringToStream(
        `<script type="application/ld+json">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }</script>`);
    });

    describe('for parsing', () => {

      it('should test on text/html', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'text/html' })).resolves.toBeTruthy();
      });

      it('should not test on application/json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'application/json' })).rejects.toBeTruthy();
      });

      it('should not test on application/ld+json', () => {
        return expect(actor.test({ handle: { input, baseIRI: '' },
          handleMediaType: 'application/ld+json' })).rejects.toBeTruthy();
      });

      it('should run', async () => {
        return actor.run({ context, handle: { input, baseIRI: '' },
          handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

      it('should run with wrong script type but no output', () => {
        input = stringToStream(
          `<script type="text/plain">{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
          }</script>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([]));
      });

      it('should run with no script type but no output', () => {
        input = stringToStream(
          `<script>random_text_between_script_tags</script>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([]));
      });

      it('should run with one N-Quads script', () => {
        input = stringToStream(
          `<script type="application/n-quads">
            <http://example.org/f> <http://example.org/g> <http://example.org/h> .
            <http://example.org/f> <http://example.org/i> <http://example.org/j> .
          </script>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad("http://example.org/f", "http://example.org/g", "http://example.org/h", ""),
            quad("http://example.org/f", "http://example.org/i", "http://example.org/j", ""),
          ]));
      });

      it('should run with two JSON-LD scripts', () => {
        input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
          }]
          </script>
          <script type="application/ld+json">
          [{
              "@id": "http://example.org/f",
              "http://example.org/g": "http://example.org/h",
              "http://example.org/i": "http://example.org/j"
          }]
          </script>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toBeRdfIsomorphic([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/f', 'http://example.org/g', '"http://example.org/h"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
            quad('http://example.org/f', 'http://example.org/i', '"http://example.org/j"'),
          ]));
      });

      it('should run with one JSON-LD script and one text/plain script', () => {
        input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": {
                "@id": "http://example.org/c"
              },
              "http://example.org/d": {
                "@id": "http://example.org/e"
              }
          }]
          </script>
          <script type="text/plain">
          [{
              "@id": "http://example.org/f",
              "http://example.org/g": "http://example.org/h",
              "http://example.org/i": "http://example.org/j"
          }]
          </script>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', 'http://example.org/c'),
            quad('http://example.org/a', 'http://example.org/d', 'http://example.org/e'),
          ]));
      });

      it('should run with two JSON-LD scripts and one N-Quads script', () => {
        input = stringToStream(
          `<script type="application/ld+json">
          [{
              "@id": "http://example.org/a",
              "http://example.org/b": {
                "@id": "http://example.org/c"
              },
              "http://example.org/d": {
                "@id": "http://example.org/e"
              }
          }]
          </script>
          <script type="application/n-quads">
            <http://example.org/f> <http://example.org/g> <http://example.org/h> .
            <http://example.org/f> <http://example.org/i> <http://example.org/j> .
          </script>
          <script type="application/ld+json">
            [{
              "@id": "http://example.org/k",
              "http://example.org/l": {
                "@id": "http://example.org/m"
              },
              "http://example.org/n": {
                "@id": "http://example.org/o"
              }
            }]
          </script>
`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toBeRdfIsomorphic([
            quad("http://example.org/a", "http://example.org/b", "http://example.org/c", ""),
            quad("http://example.org/k", "http://example.org/l", "http://example.org/m", ""),
            quad("http://example.org/a", "http://example.org/d", "http://example.org/e", ""),
            quad("http://example.org/k", "http://example.org/n", "http://example.org/o", ""),
            quad("http://example.org/f", "http://example.org/g", "http://example.org/h", ""),
            quad("http://example.org/f", "http://example.org/i", "http://example.org/j", "")
          ]));
      });

      it('should run with real HTML input', () => {
        input = stringToStream(
          `<!DOCTYPE html>
           <html>
            <body>
                <h1>My First Heading</h1>
                <p>My first paragraph.</p>
                <script type="application/ld+json">
                  [{
                  "@id": "http://example.org/a",
                  "http://example.org/b": "http://example.org/c",
                  "http://example.org/d": "http://example.org/e"
                  }]
                </script>
                <p>My second paragraph.</p>
            </body>
           </html>`);

        return actor.run(
          { context, handle: { input, baseIRI: '' },
            handleMediaType: 'text/html' })
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });

    });
  });
});
