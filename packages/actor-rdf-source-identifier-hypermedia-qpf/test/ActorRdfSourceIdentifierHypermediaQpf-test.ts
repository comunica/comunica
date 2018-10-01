import {ActorRdfSourceIdentifier} from "@comunica/bus-rdf-source-identifier";
import {Bus} from "@comunica/core";
import "isomorphic-fetch";
import {ActorRdfSourceIdentifierHypermediaQpf} from "../lib/ActorRdfSourceIdentifierHypermediaQpf";

describe('ActorRdfSourceIdentifierHypermediaQpf', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSourceIdentifierHypermediaQpf module', () => {
    it('should be a function', () => {
      expect(ActorRdfSourceIdentifierHypermediaQpf).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSourceIdentifierHypermediaQpf constructor', () => {
      expect(new (<any> ActorRdfSourceIdentifierHypermediaQpf)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifierHypermediaQpf);
      expect(new (<any> ActorRdfSourceIdentifierHypermediaQpf)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifier);
    });

    it('should not be able to create new ActorRdfSourceIdentifierHypermediaQpf objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSourceIdentifierHypermediaQpf)(); }).toThrow();
    });
  });

  describe('An ActorRdfSourceIdentifierHypermediaQpf instance', () => {
    let actor: ActorRdfSourceIdentifierHypermediaQpf;

    beforeEach(() => {
      const mediatorHttp: any = {
        mediate: (action) => {
          if (action.input.indexOf('nobody') >= 0) {
            return Promise.resolve({ ok: false });
          }
          const body = require('streamify-string')(action.input);
          body.cancel = () => Promise.resolve();
          return Promise.resolve({ ok: action.input.indexOf('ok') >= 0, body });
        },
      };
      const acceptHeader = 'abc';
      const toContain = [ 'def' ];
      const priority = 1;
      actor = new ActorRdfSourceIdentifierHypermediaQpf(
        { name: 'actor', bus, mediatorHttp, acceptHeader, toContain, priority });
    });

    it('should not test on non-http requests', () => {
      return expect(actor.test({ sourceValue: 'abc://' })).rejects.toBeTruthy();
    });

    it('should test on valid http requests', () => {
      return expect(actor.test({ sourceValue: 'http://ok/contains/def' })).resolves.toBeTruthy();
    });

    it('should test on valid https requests', () => {
      return expect(actor.test({ sourceValue: 'https://ok/contains/def' })).resolves.toBeTruthy();
    });

    it('should not test on valid https requests without the required things', () => {
      return expect(actor.test({ sourceValue: 'https://ok/contains/ghi' })).rejects.toBeTruthy();
    });

    it('should not test on invalid requests', () => {
      return expect(actor.test({ sourceValue: 'http://fail' })).rejects.toBeTruthy();
    });

    it('should not test on invalid requests, even if they contain the right things', () => {
      return expect(actor.test({ sourceValue: 'http://fail/contains/def' })).rejects.toBeTruthy();
    });

    it('should not test on invalid requests without body', () => {
      return expect(actor.test({ sourceValue: 'http://fail/nobody' })).rejects.toBeTruthy();
    });

    it('should run', () => {
      return expect(actor.run(null)).resolves.toMatchObject({ sourceType: 'hypermedia' });
    });
  });
});
