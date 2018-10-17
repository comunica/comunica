import {ActorRdfParse, ActorRdfParseFixedMediaTypes} from "@comunica/bus-rdf-parse";
import {Bus} from "@comunica/core";
import "jest-rdf";
import {Readable} from "stream";
import {ActorRdfParseHtml} from "../lib/ActorRdfParseHtml";
const quad = require('rdf-quad');
const arrayifyStream = require('arrayify-stream');
const stringToStream = require('streamify-string');

describe('ActorRdfParseHtml', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({name: 'bus'});
  });

  describe('The ActorRdfParseHtml module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtml).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtml constructor', () => {
      expect(new (<any> ActorRdfParseHtml)({name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseHtml);
      expect(new (<any> ActorRdfParseHtml)({name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseFixedMediaTypes);
    });

    it('should not be able to create new ActorRdfParseHtml objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseHtml)();
      }).toThrow();
    });
  });

  describe('An ActorRdfParseHtml instance', () => {
    let actor: ActorRdfParseHtml;
    let input: Readable;

    beforeEach(() => {
      actor = new ActorRdfParseHtml({name: 'actor', bus, mediaTypes: {'text/html': 1.0}});
    });

    describe('for parsing', () => {
      beforeEach(() => {
        input = stringToStream(`&lt;script type="application/ld+json&gt;"{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
          }&lt;/script&gt;`);
      });

      it('should test on text/html', () => {
        return expect(actor.test({handle: { input }, handleMediaType: 'text/html'})).resolves.toBeTruthy();
      });

      it('should not test on application/json', () => {
        return expect(actor.test({handle: { input }, handleMediaType: 'application/json'})).rejects.toBeTruthy();
      });

      it('should not test on application/ld+json', () => {
        return expect(actor.test({handle: { input }, handleMediaType: 'application/ld+json'})).rejects.toBeTruthy();
      });

      it('should run', () => {
        return actor.run({handle: { input }, handleMediaType: 'text/html'})
          .then(async (output) => expect(await arrayifyStream(output.handle.quads)).toEqualRdfQuadArray([
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          ]));
      });
    });
  });
});
