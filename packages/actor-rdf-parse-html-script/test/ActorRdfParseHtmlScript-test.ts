import {ActorRdfParseJsonLd} from "@comunica/actor-rdf-parse-jsonld";
import {ActorRdfParseN3} from "@comunica/actor-rdf-parse-n3";
import {ActorRdfParseRdfXml} from "@comunica/actor-rdf-parse-rdfxml";
import {ActionContext, Bus} from "@comunica/core";
import "jest-rdf";
import {ActorRdfParseHtmlScript} from "../lib/ActorRdfParseHtmlScript";
import {HtmlScriptListener} from "../lib/HtmlScriptListener";

const quad = require('rdf-quad');

describe('ActorRdfParseHtml', () => {
  let bus;
  let mediator;
  let context;

  let jsonldParser: ActorRdfParseJsonLd;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    jsonldParser = new ActorRdfParseJsonLd({ bus, mediaTypes: { 'application/ld+json': 1.0 }, name: 'jsonldParser' });

    mediator = {
      mediate: async (action) => {
        if (action.mediaTypes === true) {
          return Promise.resolve({ mediaTypes: {
            "application/ld+json": 1,
          } });
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

    context = ActionContext({});
  });

  describe('The ActorRdfParseHtmlScript module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtmlScript).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtmlScript constructor', () => {
      expect(new (<any> ActorRdfParseHtmlScript)({name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseHtmlScript);
    });

    it('should not be able to create new ActorRdfParseHtml objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseHtmlScript)();
      }).toThrow();
    });
  });

  describe('An ActorRdfParseHtmlScript instance', () => {
    let actor: ActorRdfParseHtmlScript;

    beforeEach(() => {
      actor = new ActorRdfParseHtmlScript({
        bus,
        mediatorRdfParseHandle: mediator,
        mediatorRdfParseMediatypes: mediator,
        name: 'actor',
      });
    });

    describe('test', () => {
      it('should return true', async () => {
        return expect(await actor.test(<any> {})).toBeTruthy();
      });
    });

    describe('run', () => {
      let baseIRI;
      let headers;
      let emit;
      let error;
      let end;
      let onEnd;
      let action;

      beforeEach(() => {
        baseIRI = 'http://example.org/';
        headers = null;
        emit = jest.fn();
        onEnd = new Promise((resolve, reject) => {
          end = jest.fn(resolve);
          error = jest.fn(reject);
        });
        action = { baseIRI, headers, emit, error, end };
      });

      it('should return an HtmlScriptListener', async () => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(HtmlScriptListener);
      });

      describe('the html listener', () => {
        let listener;
        beforeEach(async () => {
          listener = (await actor.run(action)).htmlParseListener;
        });

        it('should handle a jsonld script tag', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(2);
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'));
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'));
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle two jsonld script tags', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "http://example.org/A",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(4);
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'));
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'));
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/A', 'http://example.org/b', '"http://example.org/c"'));
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/A', 'http://example.org/d', '"http://example.org/e"'));
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle a jsonld script tag and inherit baseIRI', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(2);
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/', 'http://example.org/b', '"http://example.org/c"'));
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/', 'http://example.org/d', '"http://example.org/e"'));
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should ignore an unknown script tag', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'text/plain' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(0);
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should ignore an script tag without type', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', {});
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(0);
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should delegate error events', async () => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            """@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          return expect(onEnd).rejects.toThrow(new Error('Unexpected STRING("@id") in state COLON'));
        });
      });
    });
  });
});
