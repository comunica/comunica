import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {ActorInitJoin} from "../lib/ActorInitJoin";

describe('ActorInitJoin', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorInitJoin module', () => {
    it('should be a function', () => {
      expect(ActorInitJoin).toBeInstanceOf(Function);
    });

    it('should be a ActorInitJoin constructor', () => {
      expect(new (<any> ActorInitJoin)({ name: 'actor', bus })).toBeInstanceOf(ActorInitJoin);
      expect(new (<any> ActorInitJoin)({ name: 'actor', bus })).toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitJoin objects without \'new\'', () => {
      expect(() => { (<any> ActorInitJoin)(); }).toThrow();
    });
  });

  describe('An ActorInitJoin instance', () => {
    let actor: ActorInitJoin;

    beforeEach(() => {
      actor = new ActorInitJoin({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
