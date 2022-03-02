import { ActionContext, Bus } from '@comunica/core';
import { ActorRdfMetadataExtractRequestTime } from '../lib/ActorRdfMetadataExtractRequestTime';

describe('ActorRdfMetadataExtractRequestTime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfMetadataExtractRequestTime instance', () => {
    let actor: ActorRdfMetadataExtractRequestTime;

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractRequestTime({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ url: '', metadata: <any> undefined, requestTime: 0, context: new ActionContext() }))
        .resolves.toBeTruthy();
    });

    it('should run and return the requestTime', () => {
      return expect(actor.run({ url: '', metadata: <any> undefined, requestTime: 123, context: new ActionContext() }))
        .resolves.toEqual({ metadata: { requestTime: 123 }});
    });
  });
});
