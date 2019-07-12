import {ActorRdfResolveHypermediaLinks} from "@comunica/bus-rdf-resolve-hypermedia-links";
import {Bus} from "@comunica/core";
import {ActorRdfResolveHypermediaLinksNext} from "../lib/ActorRdfResolveHypermediaLinksNext";

describe('ActorRdfResolveHypermediaLinksNext', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorRdfResolveHypermediaLinksNext module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveHypermediaLinksNext).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveHypermediaLinksNext constructor', () => {
      expect(new (<any> ActorRdfResolveHypermediaLinksNext)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermediaLinksNext);
      expect(new (<any> ActorRdfResolveHypermediaLinksNext)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorRdfResolveHypermediaLinks);
    });

    it('should not be able to create new ActorRdfResolveHypermediaLinksNext objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveHypermediaLinksNext)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveHypermediaLinksNext instance', () => {
    let actor: ActorRdfResolveHypermediaLinksNext;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaLinksNext({ name: 'actor', bus });
    });

    it('should test on next metadata', () => {
      return expect(actor.test({ metadata: { next: 'NEXT' }})).resolves.toBeTruthy();
    });

    it('should not test without next metadata', () => {
      return expect(actor.test({ metadata: {}})).rejects
        .toThrow(new Error('Actor actor requires a \'next\' metadata entry.'));
    });

    it('should run', () => {
      return expect(actor.run({ metadata: { next: 'NEXT' }})).resolves.toMatchObject({ urls: ['NEXT'] });
    });
  });
});
