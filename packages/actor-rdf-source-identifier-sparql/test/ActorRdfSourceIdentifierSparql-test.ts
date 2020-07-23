import { ActorRdfSourceIdentifier } from '@comunica/bus-rdf-source-identifier';
import { Bus } from '@comunica/core';
import 'cross-fetch/polyfill';
import { ActorRdfSourceIdentifierSparql } from '..';

describe('ActorRdfSourceIdentifierSparql', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSourceIdentifierSparql module', () => {
    it('should be a function', () => {
      expect(ActorRdfSourceIdentifierSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSourceIdentifierSparql constructor', () => {
      expect(new (<any> ActorRdfSourceIdentifierSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifierSparql);
      expect(new (<any> ActorRdfSourceIdentifierSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifier);
    });

    it('should not be able to create new ActorRdfSourceIdentifierSparql objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSourceIdentifierSparql)(); }).toThrow();
    });
  });

  describe('An ActorRdfSourceIdentifierSparql instance', () => {
    let actor: ActorRdfSourceIdentifierSparql;

    beforeEach(() => {
      const mediatorHttp: any = {
        mediate(action: any) {
          if (action.input.includes('nobody')) {
            return Promise.resolve({
              headers: { get: () => 'application/sparql-results+json' },
              ok: action.input.includes('ok'),
            });
          }
          return Promise.resolve({
            body: {
              cancel: () => null,
            },
            headers: { get: () => 'application/sparql-results+json' },
            ok: action.input.includes('ok'),
          });
        },
      };
      const priority = 1;
      actor = new ActorRdfSourceIdentifierSparql({ name: 'actor', bus, mediatorHttp, priority });
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

    it('should test on valid https requests without body', () => {
      return expect(actor.test({ sourceValue: 'https://ok/nobody' })).resolves.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run(<any> null)).resolves.toMatchObject({ sourceType: 'sparql' });
    });
  });
});
