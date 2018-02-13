import {ActorInit} from "@comunica/bus-init";
import {Bus} from "@comunica/core";
import {SingletonIterator} from "asynciterator";
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
    let mediator;
    let leftPattern;
    let rightPattern;
    let context;

    beforeEach(() => {
      mediator = { mediate: () => {
        return {
          bindingsStream: new SingletonIterator('a'),
          metadata: {},
          type: 'bindings',
          variables: {},
        };
      }};
      leftPattern = '';
      rightPattern = '';
      context = '{}';
      actor = new ActorInitJoin({ bus, context, joinMediator: mediator, leftPattern,
        name: 'actor', operationMediator: mediator, rightPattern });
    });

    it('should test', () => {
      return expect(actor.test(null)).resolves.toBeTruthy();
    });

    it('should stop if no patterns are provided', () => {
      return expect(actor.run(null)).rejects.toBeTruthy();
    });

    it('should run', () => {
      actor = new ActorInitJoin({ bus, context, joinMediator: mediator, leftPattern: '{}',
        name: 'actor', operationMediator: mediator, rightPattern: '{}' });
      return actor.run(null)
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });

    it('should run without context', () => {
      actor = new ActorInitJoin({ bus, context: null, joinMediator: mediator, leftPattern: '{}',
        name: 'actor', operationMediator: mediator, rightPattern: '{}' });
      return actor.run(null)
        .then((result) => {
          return new Promise((resolve, reject) => {
            result.stdout.on('data', (line) => expect(line).toBeTruthy());
            result.stdout.on('end', resolve);
          });
        });
    });
  });
});
