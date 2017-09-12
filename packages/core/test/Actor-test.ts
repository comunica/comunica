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

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> Actor)({ bus }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> Actor)({ name: 'name' }); }).toThrow();
    });

    it('should throw an error when constructed without a name and bus', () => {
      expect(() => { new (<any> Actor)({}); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> Actor)(); }).toThrow();
    });
  });

  describe('An Actor instance', () => {
    const actor = new (<any> Actor)({ name: 'actor', bus });

    it('should have a \'name\' field', () => {
      expect(actor.name).toEqual('actor');
    });

    it('should have a \'bus\' field', () => {
      expect(actor.bus).toEqual(bus);
    });
  });
});
