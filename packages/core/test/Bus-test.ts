import {Actor} from "../lib/Actor";
import {Bus} from "../lib/Bus";

describe('Bus', () => {
  describe('The Bus module', () => {
    it('should be a function', () => {
      expect(Bus).toBeInstanceOf(Function);
    });

    it('should be a Bus constructor', () => {
      expect(new Bus({ name: 'Bus' })).toBeInstanceOf(Bus);
    });

    it('should not be able to create new Bus objects without \'new\'', () => {
      expect(() => { (<any> Bus)(); }).toThrow();
    });
  });

  describe('A Bus instance', () => {
    let bus: any;
    const actor1 = new (<any> Actor)({ name: 'actor1', bus: new Bus({ name: 'bus1' }) });
    const actor2 = new (<any> Actor)({ name: 'actor2', bus: new Bus({ name: 'bus2' }) });
    const actor3 = new (<any> Actor)({ name: 'actor3', bus: new Bus({ name: 'bus3' }) });

    const actorTest = (action: any) => {
      return new Promise((resolve) => {
        resolve({ type: 'test', sent: action });
      });
    };

    beforeEach(() => {
      actor1.test = actorTest;
      actor2.test = actorTest;
      actor3.test = actorTest;

      jest.spyOn(actor1, 'test');
      jest.spyOn(actor2, 'test');
      jest.spyOn(actor3, 'test');

      bus = new Bus({ name: 'bus' });
    });

    it('should have a \'name\' field', () => {
      expect(bus.name).toEqual('bus');
    });

    it('should allow an actor to be subscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow an actor to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toHaveLength(1);
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toHaveLength(0);
    });

    it('should allow multiple actors to be subscribed and unsubscribed', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor2);
      bus.subscribe(actor3);
      expect(bus.actors).toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).toContain(actor3);
      expect(bus.actors).toHaveLength(3);
      expect(bus.unsubscribe(actor1)).toBeTruthy();
      expect(bus.actors).toHaveLength(2);
      expect(bus.unsubscribe(actor3)).toBeTruthy();
      expect(bus.actors).not.toContain(actor1);
      expect(bus.actors).toContain(actor2);
      expect(bus.actors).not.toContain(actor3);
      expect(bus.actors).toHaveLength(1);
    });

    it('should allow an actor to be subscribed multiple times', () => {
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      bus.subscribe(actor1);
      expect(bus.actors).toHaveLength(3);
    });

    it('should return \'false\' when unsubscribing an actor that was not subscribed', () => {
      expect(bus.unsubscribe(actor1)).toBeFalsy();
    });

    describe('without actors', () => {
      it('should send an action to 0 actors', () => {
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });
    });

    describe('with 1 actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
      });

      it('should send an action to 1 actor', () => {
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should send two actions to 1 actor', () => {
        bus.publish({});
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(2);
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should send no action to 1 unsubscribed actor', () => {
        bus.unsubscribe(actor1);
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).not.toHaveBeenCalled();
        expect(actor3.test).not.toHaveBeenCalled();
      });

      it('should receive 1 publication reply', () => {
        expect(bus.publish({})).toHaveLength(1);
      });

      it('should receive a correct publication reply', () => {
        expect(bus.publish({ a: 'b' })[0].actor).toEqual(actor1);
        expect(bus.publish({ a: 'b' })[0].reply).toBeInstanceOf(Promise);
        return expect(bus.publish({ a: 'b' })[0].reply).resolves.toEqual({ type: 'test', sent: { a: 'b' } });
      });
    });

    describe('with 3 actors', () => {
      beforeEach(() => {
        bus.subscribe(actor1);
        bus.subscribe(actor2);
        bus.subscribe(actor3);
      });

      it('should send an action to 3 actors', () => {
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(1);
        expect(actor2.test).toHaveBeenCalledTimes(1);
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should send two actions to 3 actors', () => {
        bus.publish({});
        bus.publish({});
        expect(actor1.test).toHaveBeenCalledTimes(2);
        expect(actor2.test).toHaveBeenCalledTimes(2);
        expect(actor3.test).toHaveBeenCalledTimes(2);
      });

      it('should send no action to 1 unsubscribed actor, but an action to 2 subscribed actors', () => {
        bus.unsubscribe(actor1);
        bus.publish({});
        expect(actor1.test).not.toHaveBeenCalled();
        expect(actor2.test).toHaveBeenCalledTimes(1);
        expect(actor3.test).toHaveBeenCalledTimes(1);
      });

      it('should receive 3 publication replies', () => {
        expect(bus.publish({})).toHaveLength(3);
      });

      it('should receive correct publication replies', () => {
        expect(bus.publish({ a: 'b' })[0].actor).toBe(actor1);
        expect(bus.publish({ a: 'b' })[0].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[1].actor).toBe(actor2);
        expect(bus.publish({ a: 'b' })[1].reply).toBeInstanceOf(Promise);

        expect(bus.publish({ a: 'b' })[2].actor).toBe(actor3);
        expect(bus.publish({ a: 'b' })[2].reply).toBeInstanceOf(Promise);
      });
    });

  });
});
