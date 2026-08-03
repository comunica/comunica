import { ActorRdfParseJsonLd } from '@comunica/actor-rdf-parse-jsonld';
import type { IActionRdfParseHtml, IHtmlParseListener } from '@comunica/bus-rdf-parse-html';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfParseHtmlScript } from '../lib/ActorRdfParseHtmlScript';
import { HtmlScriptListener } from '../lib/HtmlScriptListener';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

const DF = new DataFactory();

describe('ActorRdfParseHtml', () => {
  let bus: any;
  let mediator: any;
  let context: IActionContext;

  let jsonldParser: ActorRdfParseJsonLd;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    const mediatorHttp: any = null;
    jsonldParser = new ActorRdfParseJsonLd(
      {
        bus,
        mediaTypePriorities: { 'application/ld+json': 1 },
        mediaTypeFormats: {},
        name: 'jsonldParser',
        mediatorHttp,
        httpInvalidator: <any> { addInvalidateListener: jest.fn() },
        cacheSize: 10,
      },
    );

    mediator = {
      async mediate(action: any) {
        if (action.mediaTypes === true) {
          return { mediaTypes: {
            'application/ld+json': 1,
            fail: 1,
          }};
        }
        action.data = action.handle.data;
        action.metadata = action.handle.metadata;

        let output: any;
        switch (action.handleMediaType) {
          case 'application/ld+json':
            output = await jsonldParser.runHandle(action, action.handleMediaType, context);
            break;
          case 'fail':
            throw new Error('Parsing failure');
        }
        return {
          handle: { data: output.data },
        };
      },
    };

    context = new ActionContext({});
  });

  describe('The ActorRdfParseHtmlScript module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtmlScript).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtmlScript constructor', () => {
      expect(new (<any> ActorRdfParseHtmlScript)({ name: 'actor', bus, mediaTypes: {}}))
        .toBeInstanceOf(ActorRdfParseHtmlScript);
    });

    it('should not be able to create new ActorRdfParseHtml objects without \'new\'', () => {
      expect(() => {
        (<any> ActorRdfParseHtmlScript)();
      }).toThrow(`Class constructor ActorRdfParseHtmlScript cannot be invoked without 'new'`);
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
      it('should return true', async() => {
        await expect(actor.test(<any> {})).resolves.toPassTestVoid();
      });
    });

    describe('run', () => {
      let baseIRI: string;
      let headers: any;
      let emit: any;
      let error: any;
      let end: any;
      let onEnd: any;
      let action: IActionRdfParseHtml;

      beforeEach(() => {
        baseIRI = 'http://example.org/';
        headers = null;
        emit = jest.fn();
        onEnd = new Promise((resolve, reject) => {
          end = jest.fn(resolve);
          error = jest.fn(reject);
        });
        action = { baseIRI, headers, emit, error, end, context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
        }) };
      });

      it('should return an HtmlScriptListener', async() => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(HtmlScriptListener);
      });

      describe('the html listener', () => {
        let listener: IHtmlParseListener;
        beforeEach(async() => {
          listener = (await actor.run(action)).htmlParseListener;
        });

        it('should handle a jsonld script tag', async() => {
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle two jsonld script tags', async() => {
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/A', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/A', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle two jsonld script tags in graphs', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@graph": {
              "@id": "http://example.org/a",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
            }
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@graph": {
              "@id": "http://example.org/A",
              "http://example.org/b": "http://example.org/c",
              "http://example.org/d": "http://example.org/e"
            }
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(4);
          // / Use fn calls
          expect(emit.mock.calls[0][0].subject.value).toBe('http://example.org/a');
          expect(emit.mock.calls[0][0].predicate.value).toBe('http://example.org/b');
          expect(emit.mock.calls[0][0].object.value).toBe('http://example.org/c');

          expect(emit.mock.calls[1][0].subject.value).toBe('http://example.org/a');
          expect(emit.mock.calls[1][0].predicate.value).toBe('http://example.org/d');
          expect(emit.mock.calls[1][0].object.value).toBe('http://example.org/e');
          expect(emit.mock.calls[1][0].graph).toEqual(emit.mock.calls[0][0].graph);

          expect(emit.mock.calls[2][0].subject.value).toBe('http://example.org/A');
          expect(emit.mock.calls[2][0].predicate.value).toBe('http://example.org/b');
          expect(emit.mock.calls[2][0].object.value).toBe('http://example.org/c');

          expect(emit.mock.calls[3][0].subject.value).toBe('http://example.org/A');
          expect(emit.mock.calls[3][0].predicate.value).toBe('http://example.org/d');
          expect(emit.mock.calls[3][0].object.value).toBe('http://example.org/e');
          expect(emit.mock.calls[3][0].graph).toEqual(emit.mock.calls[2][0].graph);

          expect(emit.mock.calls[0][0].graph).not.toEqual(emit.mock.calls[2][0].graph);

          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle a jsonld script tag and inherit baseIRI', async() => {
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
            quad('http://example.org/', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should ignore an unknown script tag', async() => {
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

        it('should ignore an script tag without type', async() => {
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

        it('should delegate error events', async() => {
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

          await expect(onEnd).rejects.toThrow(new Error('Unexpected STRING("@id") in state COLON'));
        });

        it('should ignore mediator failures', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'fail' });
          listener.onText(`{
            """@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await onEnd;

          expect(emit).toHaveBeenCalledTimes(0);
        });

        it('should handle an absolute base tag', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('base', { href: 'http://base.org/' });
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "a",
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
            quad('http://base.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://base.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle a relative base tag', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('base', { href: 'subBase/' });
          listener.onTagOpen('script', { type: 'application/ld+json' });
          listener.onText(`{
            "@id": "a",
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
            quad('http://example.org/subBase/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/subBase/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('run for a target script', () => {
      let baseIRI: string;
      let headers: any;
      let emit: any;
      let error: any;
      let end: any;
      let onEnd: any;
      let action: IActionRdfParseHtml;

      beforeEach(() => {
        baseIRI = 'http://example.org/#scriptId';
        headers = null;
        emit = jest.fn();
        onEnd = new Promise((resolve, reject) => {
          end = jest.fn(resolve);
          error = jest.fn(reject);
        });
        action = { baseIRI, headers, emit, error, end, context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
        }) };
      });

      it('should return an HtmlScriptListener', async() => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(HtmlScriptListener);
      });

      describe('the html listener', () => {
        let listener: any;
        beforeEach(async() => {
          listener = (await actor.run(action)).htmlParseListener;
        });

        it('should handle a jsonld script tag with the given id', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptId' });
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle a jsonld script tag with the given id and ignore others', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptIdIgnore1' });
          listener.onText(`{
            "@id": "http://example.org/A1",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptIdIgnore2' });
          listener.onText(`{
            "@id": "http://example.org/A2",
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should error when no script with the given id was found', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'otherScriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await expect(onEnd).rejects.toThrow(new Error('Failed to find targeted script id "scriptId"'));
        });

        it('should error when a script with the given id was found with an unsupported content type', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/json', id: 'scriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await expect(onEnd).rejects.toThrow(new Error('Targeted script "scriptId" does not have a supported type'));
        });

        it('should not ignore mediator failures when targeting this script', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'fail', id: 'scriptId' });
          listener.onText(`{
            """@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await expect(onEnd).rejects.toThrow(new Error('Parsing failure'));
        });
      });
    });

    describe('run for a single script', () => {
      let baseIRI: string;
      let headers: any;
      let emit: any;
      let error: any;
      let end: any;
      let onEnd: any;
      let action: IActionRdfParseHtml;

      beforeEach(() => {
        baseIRI = 'http://example.org/';
        headers = null;
        emit = jest.fn();
        onEnd = new Promise((resolve, reject) => {
          end = jest.fn(resolve);
          error = jest.fn(reject);
        });
        action = { baseIRI, headers, emit, error, end, context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          extractAllScripts: false,
        }) };
      });

      it('should return an HtmlScriptListener', async() => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(HtmlScriptListener);
      });

      describe('the html listener', () => {
        let listener: any;
        beforeEach(async() => {
          listener = (await actor.run(action)).htmlParseListener;
        });

        it('should handle the first of two jsonld script tags', async() => {
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

          expect(emit).toHaveBeenCalledTimes(2);
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('run for a single target script', () => {
      let baseIRI: string;
      let headers: any;
      let emit: any;
      let error: any;
      let end: any;
      let onEnd: any;
      let action: IActionRdfParseHtml;

      beforeEach(() => {
        baseIRI = 'http://example.org/#scriptId';
        headers = null;
        emit = jest.fn();
        onEnd = new Promise((resolve, reject) => {
          end = jest.fn(resolve);
          error = jest.fn(reject);
        });
        action = { baseIRI, headers, emit, error, end, context: new ActionContext({
          [KeysInitQuery.dataFactory.name]: DF,
          extractAllScripts: false,
        }) };
      });

      it('should return an HtmlScriptListener', async() => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(HtmlScriptListener);
      });

      describe('the html listener', () => {
        let listener: any;
        beforeEach(async() => {
          listener = (await actor.run(action)).htmlParseListener;
        });

        it('should handle a jsonld script tag with the given id', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptId' });
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should handle a jsonld script tag with the given id and ignore others', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptIdIgnore1' });
          listener.onText(`{
            "@id": "http://example.org/A1",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'scriptIdIgnore2' });
          listener.onText(`{
            "@id": "http://example.org/A2",
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
            quad('http://example.org/a', 'http://example.org/b', '"http://example.org/c"'),
          );
          expect(emit).toHaveBeenCalledWith(
            quad('http://example.org/a', 'http://example.org/d', '"http://example.org/e"'),
          );
          expect(error).not.toHaveBeenCalled();
          expect(end).toHaveBeenCalledTimes(1);
        });

        it('should error when no script with the given id was found', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/ld+json', id: 'otherScriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await expect(onEnd).rejects.toThrow(new Error('Failed to find targeted script id "scriptId"'));
        });

        it('should error when a script with the given id was found with an unsupported content type', async() => {
          listener.onTagOpen('html', {});
          listener.onTagOpen('body', {});
          listener.onTagOpen('script', { type: 'application/json', id: 'scriptId' });
          listener.onText(`{
            "@id": "http://example.org/a",
            "http://example.org/b": "http://example.org/c",
            "http://example.org/d": "http://example.org/e"
        }`);
          listener.onTagClose();
          listener.onTagClose();
          listener.onTagClose();
          listener.onEnd();

          await expect(onEnd).rejects.toThrow(new Error('Targeted script "scriptId" does not have a supported type'));
        });
      });
    });
  });
});
