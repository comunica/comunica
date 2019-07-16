import {ActorRdfParseHtml} from "@comunica/bus-rdf-parse-html";
import {Bus} from "@comunica/core";
import {RDFA_FEATURES, RdfaParser} from "rdfa-streaming-parser";
import {ActorRdfParseHtmlRdfa} from "../lib/ActorRdfParseHtmlRdfa";

const quad = require('rdf-quad');

describe('ActorRdfParseHtmlRdfa', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfParseHtmlRdfa module', () => {
    it('should be a function', () => {
      expect(ActorRdfParseHtmlRdfa).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfParseHtmlRdfa constructor', () => {
      expect(new (<any> ActorRdfParseHtmlRdfa)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfParseHtmlRdfa);
      expect(new (<any> ActorRdfParseHtmlRdfa)({ name: 'actor', bus })).toBeInstanceOf(ActorRdfParseHtml);
    });

    it('should not be able to create new ActorRdfParseHtmlRdfa objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfParseHtmlRdfa)(); }).toThrow();
    });
  });

  describe('An ActorRdfParseHtmlRdfa instance', () => {
    let actor: ActorRdfParseHtmlRdfa;

    beforeEach(() => {
      actor = new ActorRdfParseHtmlRdfa({ name: 'actor', bus });
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
      let action;

      beforeEach(() => {
        baseIRI = 'http://example.org/';
        headers = {
          get: (key: string) => {
            if (key === 'content-type') {
              return 'xml';
            }
            if (key === 'content-language') {
              return 'en-us';
            }
            return null;
          },
        };
        emit = jest.fn();
        error = jest.fn();
        end = jest.fn();
        action = { baseIRI, headers, emit, error, end };
      });

      it('should return an RdfaParser', async () => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect(listener).toBeInstanceOf(RdfaParser);
      });

      it('should set the profile, baseIRI and language', async () => {
        const listener = (await actor.run(action)).htmlParseListener;
        expect((<any> listener).features).toBe(RDFA_FEATURES.xhtml);
        expect((<any> listener).util.baseIRI.value).toEqual('http://example.org/');
        expect((<any> listener).activeTagStack[0].language).toEqual('en-us');
      });

      it('should set the profile, baseIRI and language for empty headers', async () => {
        headers = { get: () => null };
        action = { baseIRI, headers, emit, error, end };

        const listener = (await actor.run(action)).htmlParseListener;
        expect((<any> listener).features).toBe(RDFA_FEATURES.html);
        expect((<any> listener).util.baseIRI.value).toEqual('http://example.org/');
        expect((<any> listener).activeTagStack[0].language).toBeFalsy();
      });

      it('should set the profile, baseIRI and language for null headers', async () => {
        headers = null;
        action = { baseIRI, headers, emit, error, end };

        const listener = (await actor.run(action)).htmlParseListener;
        expect((<any> listener).features).toBe(RDFA_FEATURES.html);
        expect((<any> listener).util.baseIRI.value).toEqual('http://example.org/');
        expect((<any> listener).activeTagStack[0].language).toBeFalsy();
      });

      it('should be a valid html listener', async () => {
        const listener = (await actor.run(action)).htmlParseListener;

        listener.onTagOpen('html', {});
        listener.onTagOpen('body', {});
        listener.onTagOpen('p', { property: 'dc:title' });
        listener.onText('Title');
        listener.onTagClose();
        listener.onTagOpen('p', { property: 'dc:title2' });
        listener.onText('Title2');
        listener.onTagClose();
        listener.onTagClose();
        listener.onTagClose();
        listener.onEnd();

        expect(emit).toHaveBeenCalledTimes(2);
        expect(emit).toHaveBeenCalledWith(
          quad('http://example.org/', 'http://purl.org/dc/terms/title', '"Title"@en-us'));
        expect(emit).toHaveBeenCalledWith(
          quad('http://example.org/', 'http://purl.org/dc/terms/title2', '"Title2"@en-us'));
        expect(error).not.toHaveBeenCalled();
        expect(end).toHaveBeenCalledTimes(1);
      });

      it('should be a valid html listener that delegates error events', async () => {
        const listener = (await actor.run(action)).htmlParseListener;
        const e = new Error('abc');
        (<any> listener).emit('error', e);
        expect(error).toHaveBeenCalledWith(e);
      });
    });
  });
});
