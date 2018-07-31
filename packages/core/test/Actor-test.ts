import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";

describe('Actor', () => {
  const bus = new Bus({ name: 'bus' });

  describe('The Actor module', () => {
    it('should be a function', () => {
      expect(Actor).toBeInstanceOf(Function);
    });

    it('should be a Actor constructor', () => {
      expect(new (<any> Actor)({ name: 'actor', bus: new Bus({ name: 'bus' }) })).toBeInstanceOf(Actor);
    });

    it('should not be able to create new Actor objects without \'new\'', () => {
      expect(() => { (<any> Actor)(); }).toThrow();
    });
  });

  describe('An Actor instance', () => {
    const actor = new (<any> Actor)({ name: 'actor', bus });
    actor.run = () => { return; };

    beforeEach(() => {
      jest.spyOn(actor, 'run');
      jest.spyOn(bus, 'onRun');
    });

    it('should have a \'name\' field', () => {
      expect(actor.name).toEqual('actor');
    });

    it('should have a \'bus\' field', () => {
      expect(actor.bus).toEqual(bus);
    });

    it('should be initializable', () => {
      return expect(actor.initialize()).resolves.toBeTruthy();
    });

    it('should be deinitializable', () => {
      return expect(actor.deinitialize()).resolves.toBeTruthy();
    });

    it('should call bus#onRun and actor#run when actor#runObservable is called', () => {
      const action = { myAction: true };
      const output = actor.runObservable(action);
      expect(actor.run).toBeCalledWith(action);
      expect(bus.onRun).toBeCalledWith(actor, action, output);
    });
  });
});
