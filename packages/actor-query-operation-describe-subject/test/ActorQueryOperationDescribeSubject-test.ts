import {ActorQueryOperation, Bindings} from "@comunica/bus-query-operation";
import {Bus} from "@comunica/core";
import {ArrayIterator} from "asynciterator";
import {literal, namedNode, variable} from "rdf-data-model";
import {ActorQueryOperationDescribeSubject} from "../lib/ActorQueryOperationDescribeSubject";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationDescribeSubject', () => {
  let bus;
  let mediatorQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve(arg),
    };
  });

  describe('The ActorQueryOperationDescribeSubject module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationDescribeSubject).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationDescribeSubject constructor', () => {
      expect(new (<any> ActorQueryOperationDescribeSubject)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationDescribeSubject);
      expect(new (<any> ActorQueryOperationDescribeSubject)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationDescribeSubject objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationDescribeSubject)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationDescribeSubject instance', () => {
    let actor: ActorQueryOperationDescribeSubject;

    beforeEach(() => {
      actor = new ActorQueryOperationDescribeSubject({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on describe', () => {
      const op = { operation: { type: 'describe' } };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-describe', () => {
      const op = { operation: { type: 'some-other-type' } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run and convert the describe to a construct', () => {
      const op = {
        context: { name: 'context' },
        operation: { type: 'describe', terms: [namedNode('a'), namedNode('b')], input: { type: 'bgp', patterns: [] } },
      };
      return expect(actor.run(op)).resolves.toMatchObject({
        context: { name: "context"},
        operation: {
          input: { left: { type: 'bgp', patterns: [] }, right: {
            patterns: [
              {
                graph: { value: "" },
                object: { value: "__object0" },
                predicate: {value: "__predicate0" },
                subject: { value: "a" },
              },
              {
                graph: { value: "" },
                object: { value: "__object1" },
                predicate: {value: "__predicate1" },
                subject: { value: "b" },
              },
            ],
            type: 'bgp',
          }, type: 'join' },
          template: [
            {
              graph: { value: "" },
              object: { value: "__object0" },
              predicate: {value: "__predicate0" },
              subject: { value: "a" },
            },
            {
              graph: { value: "" },
              object: { value: "__object1" },
              predicate: {value: "__predicate1" },
              subject: { value: "b" },
            },
          ],
          type: "construct",
        },
      });
    });
  });
});
