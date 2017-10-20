import {ActorInit} from "@comunica/bus-init/lib/ActorInit";
import {Bus} from "@comunica/core/lib/Bus";
import {PassThrough} from "stream";
import {IActorOutputInit} from "../../bus-init/lib/ActorInit";
import {ActorInitHelloWorld} from "../lib/ActorInitHelloWorld";

describe('ActorInitHelloWorld', () => {
  let bus;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorInitHelloWorld module', () => {
    it('should be a function', () => {
      expect(ActorInitHelloWorld).toBeInstanceOf(Function);
    });

    it('should be a ActorInitHelloWorld constructor', () => {
      expect(new (<any> ActorInitHelloWorld)({ name: 'actor', bus })).toBeInstanceOf(ActorInitHelloWorld);
      expect(new (<any> ActorInitHelloWorld)({ name: 'actor', bus })).toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitHelloWorld objects without \'new\'', () => {
      expect(() => { (<any> ActorInitHelloWorld)(); }).toThrow();
    });

    it('should throw an error when constructed without a name', () => {
      expect(() => { new (<any> ActorInitHelloWorld)({ bus }); }).toThrow();
    });

    it('should throw an error when constructed without a bus', () => {
      expect(() => { new (<any> ActorInitHelloWorld)({ name: 'actor' }); }).toThrow();
    });

    it('should throw an error when constructed without a name and bus', () => {
      expect(() => { new (<any> ActorInitHelloWorld)({}); }).toThrow();
    });

    it('should throw an error when constructed without arguments', () => {
      expect(() => { new (<any> ActorInitHelloWorld)(); }).toThrow();
    });

    it('should have a default \'hello\' value', () => {
      expect(new (<any> ActorInitHelloWorld)({ name: 'actor', bus }).hello).toEqual('Hello');
    });

    it('should not throw an error when constructed with a \'hello\' parameter', () => {
      expect(() => { new ActorInitHelloWorld({ name: 'actor', bus, hello: 'Hi' }); }).not.toThrow();
    });

    it('should store the \'hello\' parameter', () => {
      expect(new ActorInitHelloWorld({ name: 'actor', bus, hello: 'Hi' }).hello).toEqual('Hi');
    });
  });

  describe('An ActorInitHelloWorld instance', () => {
    let actor: ActorInitHelloWorld;

    beforeEach(() => {
      actor = new ActorInitHelloWorld({ name: 'actor', bus, hello: 'Hi' });
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBe(null);
    });

    it('should run', () => {
      return actor.run({ argv: [ 'John' ], env: {}, stdin: new PassThrough() })
        .then((result: IActorOutputInit) => {
          const chunks = [];
          result.stdout.on('data', (data) => {
            chunks.push(data.toString());
          });
          result.stdout.on('end', () => {
            expect(chunks.join('')).toBe('Hi John\n');
          });
        });
    });
  });
});
