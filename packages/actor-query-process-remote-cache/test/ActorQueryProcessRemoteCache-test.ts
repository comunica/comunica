import { Bus } from '@comunica/core';
import { ActorQueryProcessRemoteCache } from '../lib/ActorQueryProcessRemoteCache';
import { translate } from 'sparqlalgebrajs';
import '@comunica/utils-jest';
import { result } from 'result-interface';

describe('ActorQueryProcessRemoteCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe(ActorQueryProcessRemoteCache.name, () => {
    describe("test", () => {
      it("should always pass the test", () => {
        const actor = new ActorQueryProcessRemoteCache({ name: 'actor', bus, fallBackQueryProcess: <any>{}, cacheHitAlgorithm: 'equality' });
        return expect(actor.test(<any>{})).resolves.toPassTestVoid();
      })
    });

    describe(ActorQueryProcessRemoteCache.equalityCacheHit.name, () => {
      it("should return true given equal queries", async () => {
        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?p   ?o. }   ");

        const resp = await ActorQueryProcessRemoteCache.equalityCacheHit(q1, q2);

        expect(resp).toStrictEqual(result(true));
      });

      it("should return false given different queries", async () => {
        const q1 = translate("SELECT * WHERE {?s ?p ?o}");
        const q2 = translate("SELECT * WHERE {?s ?z   ?o. }   ");

        const resp = await ActorQueryProcessRemoteCache.equalityCacheHit(q1, q2);

        expect(resp).toStrictEqual(result(false));
      });

    });

    describe("queryCachedResults", ()=>{

    });
  });
});
