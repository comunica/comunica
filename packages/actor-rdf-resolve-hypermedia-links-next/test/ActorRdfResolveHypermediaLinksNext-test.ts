import { ActorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfResolveHypermediaLinksNext } from '../lib/ActorRdfResolveHypermediaLinksNext';

describe('ActorRdfResolveHypermediaLinksNext', () => {
  let bus: any;

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
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaLinksNext({ name: 'actor', bus });
      context = new ActionContext();
    });

    it('should test on next metadata', () => {
      return expect(actor.test({ metadata: { next: 'NEXT' }, context })).resolves.toBeTruthy();
    });

    it('should not test without next metadata', () => {
      return expect(actor.test({ metadata: {}, context })).rejects
        .toThrow(new Error('Actor actor requires a \'next\' metadata entry.'));
    });

    it('should run', () => {
      return expect(actor.run({ metadata: { next: 'NEXT' }, context }))
        .resolves.toMatchObject({ links: [{ url: 'NEXT' }]});
    });
  });
});
