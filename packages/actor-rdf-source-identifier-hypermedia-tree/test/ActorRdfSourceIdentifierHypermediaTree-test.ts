import {ActorRdfSourceIdentifier} from "@comunica/bus-rdf-source-identifier";
import {Bus} from "@comunica/core";
import "isomorphic-fetch";
import {ActorRdfSourceIdentifierHypermediaTree} from "../lib/ActorRdfSourceIdentifierHypermediaTree";

describe('ActorRdfSourceIdentifierHypermediaTree', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfSourceIdentifierHypermediaTree module', () => {
    it('should be a function', () => {
      expect(ActorRdfSourceIdentifierHypermediaTree).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfSourceIdentifierHypermediaTree constructor', () => {
      expect(new (<any> ActorRdfSourceIdentifierHypermediaTree)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifierHypermediaTree);
      expect(new (<any> ActorRdfSourceIdentifierHypermediaTree)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfSourceIdentifier);
    });

    it('should not be able to create new ActorRdfSourceIdentifierHypermediaTree objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfSourceIdentifierHypermediaTree)(); }).toThrow();
    });
  });

  describe('An ActorRdfSourceIdentifierHypermediaTree instance', () => {
    let actor: ActorRdfSourceIdentifierHypermediaTree;

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
      actor = new ActorRdfSourceIdentifierHypermediaTree(
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
      return expect(actor.run(null)).resolves.toMatchObject({ sourceType: 'hypermedia', flags: { isTree: true } });
    });
  });
});
