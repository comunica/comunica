import {ActorHttp} from "@comunica/bus-http";
import {Bus} from "@comunica/core";
import {ActorHttpMemento} from "../lib/ActorHttpMemento";

describe('ActorHttpMemento', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorHttpMemento module', () => {
    it('should be a function', () => {
      expect(ActorHttpMemento).toBeInstanceOf(Function);
    });

    it('should be a ActorHttpMemento constructor', () => {
      expect(new (<any> ActorHttpMemento)({ name: 'actor', bus })).toBeInstanceOf(ActorHttpMemento);
      expect(new (<any> ActorHttpMemento)({ name: 'actor', bus })).toBeInstanceOf(ActorHttp);
    });

    it('should not be able to create new ActorHttpMemento objects without \'new\'', () => {
      expect(() => { (<any> ActorHttpMemento)(); }).toThrow();
    });
  });

  describe('An ActorHttpMemento instance', () => {
    let actor: ActorHttpMemento;

    beforeEach(() => {
      actor = new ActorHttpMemento({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
