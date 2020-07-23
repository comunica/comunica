import { ActorRdfSourceIdentifier } from '@comunica/bus-rdf-source-identifier';
import { Bus } from '@comunica/core';
import 'cross-fetch/polyfill';
import { ActorRdfSourceIdentifierFileContentType } from '..';

describe('ActorRdfSourceIdentifierFileContentType', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSourceIdentifierFileContentType module', () => {
    it('should be a function', () => {
      expect(ActorRdfSourceIdentifierFileContentType).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSourceIdentifierFileContentType constructor', () => {
      expect(new (<any> ActorRdfSourceIdentifierFileContentType)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifierFileContentType);
      expect(new (<any> ActorRdfSourceIdentifierFileContentType)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifier);
    });

    it('should not be able to create new ActorRdfSourceIdentifierFileContentType objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSourceIdentifierFileContentType)(); }).toThrow();
    });
  });

  describe('An ActorRdfSourceIdentifierFileContentType instance', () => {
    let actor: ActorRdfSourceIdentifierFileContentType;

    beforeEach(() => {
      const mediatorHttp: any = {
        mediate(action: any) {
          const ok: boolean = action.input.includes('ok');
          return Promise.resolve({
            headers: { get: () => ok ? 'abc' : 'def', has: (key: string) => key === 'Content-Type' },
            ok,
          });
        },
      };
      const allowedMediaTypes = [ 'abc' ];
      actor = new ActorRdfSourceIdentifierFileContentType(
        { name: 'actor', bus, mediatorHttp, allowedMediaTypes, priority: 0 },
      );
    });

    it('should not test on non-http requests', () => {
      return expect(actor.test({ sourceValue: 'abc://' })).rejects.toBeTruthy();
    });

    it('should test on valid http requests', () => {
      return expect(actor.test({ sourceValue: 'http://ok' })).resolves.toBeTruthy();
    });

    it('should test on valid https requests', () => {
      return expect(actor.test({ sourceValue: 'https://ok' })).resolves.toBeTruthy();
    });

    it('should not test on invalid requests', () => {
      return expect(actor.test({ sourceValue: 'http://fail' })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run(<any> null)).resolves.toMatchObject({ sourceType: 'file' });
    });
  });
});
