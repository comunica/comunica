import {ActorInit, IActorOutputInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {PassThrough} from "stream";
import {ActorInitHelloWorld} from "../lib/ActorInitHelloWorld";
const arrayifyStream = require('arrayify-stream');

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
        .then(async (result: IActorOutputInit) => {
          expect((await arrayifyStream(result.stdout)).map((chunk) => chunk.toString()).join('')).toBe('Hi John\n');
        });
    });
  });
});
