import {ActorHttp} from "@comunica/bus-http";
import {Bus} from "@comunica/core";
import {ActorHttpNodeFetch} from "../lib/ActorHttpNodeFetch";

jest.mock('node-fetch', () => ({ default: (url, data) => {
  return Promise.resolve({ status: url === 'https://www.google.com/' ? 200 : 404 });
}}));

describe('ActorHttpNodeFetch', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHttpNodeFetch module', () => {
    it('should be a function', () => {
      expect(ActorHttpNodeFetch).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpNodeFetch constructor', () => {
      expect(new (<any> ActorHttpNodeFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpNodeFetch);
      expect(new (<any> ActorHttpNodeFetch)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpNodeFetch objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpNodeFetch)(); }).toThrow();
    });
  });

  describe('An ActorHttpNodeFetch instance', () => {
    let actor: ActorHttpNodeFetch;

    beforeEach(() => {
      actor = new ActorHttpNodeFetch({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ url: 'https://www.google.com/' })).resolves.toEqual({ time: Infinity });
    });

    it('should run on an existing URI', () => {
      return expect(actor.run({ url: 'https://www.google.com/' })).resolves.toMatchObject({ status: 200 });
    });

    it('should run on an non-existing URI', () => {
      return expect(actor.run({ url: 'https://www.google.com/notfound' })).resolves
        .toMatchObject({ status: 404 });
    });
  });
});
