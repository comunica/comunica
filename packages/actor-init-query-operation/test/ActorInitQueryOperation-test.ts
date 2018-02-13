import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {PassThrough, Readable} from "stream";
import {ActorInitQueryOperation} from "../lib/ActorInitQueryOperation";

describe('ActorInitQueryOperation', () => {
  let bus;
  let mediator;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediator = {};
  });

  describe('The ActorInitQueryOperation module', () => {
    it('should be a function', () => {
      expect(ActorInitQueryOperation).toBeInstanceOf(Function);
    });

    it('should be a ActorInitQueryOperation constructor', () => {
      expect(new (<any> ActorInitQueryOperation)({ name: 'actor', bus, mediatorQueryOperation: mediator }))
        .toBeInstanceOf(ActorInitQueryOperation);
      expect(new (<any> ActorInitQueryOperation)({ name: 'actor', bus, mediatorQueryOperation: mediator }))
        .toBeInstanceOf(ActorInit);
    });

    it('should not be able to create new ActorInitQueryOperation objects without \'new\'', () => {
      expect(() => { (<any> ActorInitQueryOperation)(); }).toThrow();
    });
  });

  describe('An ActorInitQueryOperation instance', () => {
    let actor: ActorInitQueryOperation;

    beforeEach(() => {
      const input = new Readable({ objectMode: true });
      input._read = () => {
        input.push({ a: 'triple' });
        input.push(null);
      };
      mediator.mediate = (action) => action.operation.op === 'a' && (!action.context || action.context.c === 'd')
        ? Promise.resolve({ bindingsStream: input, type: 'bindings' }) : Promise.reject(new Error('a'));
      actor = new ActorInitQueryOperation({ name: 'actor', bus, mediatorQueryOperation: mediator });
    });

    it('should test', () => {
      return expect(actor.test({ argv: [], env: {}, stdin: new PassThrough() })).resolves.toBeTruthy();
    });

    it('should run with an operation from argv', () => {
      return actor.run({ argv: [ '{ \"op\": \"a\" }' ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with an operation from constructor param', () => {
      actor = new ActorInitQueryOperation(
        { name: 'actor', bus, mediatorQueryOperation: mediator, operation: '{ \"op\": \"a\" }' });
      return actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run for no JSON operation input', () => {
      return expect(actor.run({ argv: [ ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should not run for an invalid JSON operation input', () => {
      return expect(actor.run({ argv: [ '{' ], env: {}, stdin: new PassThrough() })).rejects.toBeTruthy();
    });

    it('should run with an operation and context from argv', () => {
      return actor.run({ argv: [ '{ \"op\": \"a\" }', '{ \"c\": \"d\" }' ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run with an operation from argv and context from constructor param', () => {
      actor = new ActorInitQueryOperation(
        { name: 'actor', bus, mediatorQueryOperation: mediator, context: '{ \"c\": \"d\" }' });
      return actor.run({ argv: [ '{ \"op\": \"a\" }' ], env: {}, stdin: new PassThrough() })
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should not run for an invalid JSON context input', () => {
      return expect(actor.run({ argv: [ '{ \"op\": \"a\" }', '{' ], env: {}, stdin: new PassThrough() }))
        .rejects.toBeTruthy();
    });
  });
});
