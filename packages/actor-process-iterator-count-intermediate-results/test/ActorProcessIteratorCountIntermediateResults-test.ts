import { Bus } from '@comunica/core';
import { ActorProcessIteratorCountIntermediateResults } from '../lib/ActorProcessIteratorCountIntermediateResults';

describe('ActorProcessIteratorCountIntermediateResults', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorProcessIteratorCountIntermediateResults instance', () => {
    let actor: ActorProcessIteratorCountIntermediateResults;

    beforeEach(() => {
      actor = new ActorProcessIteratorCountIntermediateResults({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
