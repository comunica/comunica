import type { IActorQueryOperationOutputBindings } from '@comunica/bus-query-operation';
import { ActorQueryOperation, Bindings } from '@comunica/bus-query-operation';
import { Bus } from '@comunica/core';
import { namedNode, variable } from '@rdfjs/data-model';
import Factory from 'sparqlalgebrajs/lib/factory';
import { ActorQueryOperationBgpEmpty } from '../lib/ActorQueryOperationBgpEmpty';
const arrayifyStream = require('arrayify-stream');

const factory = new Factory();

describe('ActorQueryOperationBgpEmpty', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('The ActorQueryOperationBgpEmpty module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationBgpEmpty).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationBgpEmpty constructor', () => {
      expect(new (<any> ActorQueryOperationBgpEmpty)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperationBgpEmpty);
      expect(new (<any> ActorQueryOperationBgpEmpty)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationBgpEmpty objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationBgpEmpty)(); }).toThrow();
    });
  });

  describe('#getVariables', () => {
    it('should get an empty array for an empty array of patterns', () => {
      return expect(ActorQueryOperationBgpEmpty.getVariables([])).toEqual([]);
    });

    it('should only return variables', () => {
      return expect(ActorQueryOperationBgpEmpty.getVariables([
        factory.createPattern(variable('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), variable('o2')),
      ])).toEqual([ '?s1', '?o2' ]);
    });

    it('should return distinct variables', () => {
      return expect(ActorQueryOperationBgpEmpty.getVariables([
        factory.createPattern(variable('s'), namedNode('p'), namedNode('o')),
        factory.createPattern(variable('s'), namedNode('p'), variable('o')),
      ])).toEqual([ '?s', '?o' ]);
    });
  });

  describe('An ActorQueryOperationBgpEmpty instance', () => {
    let actor: ActorQueryOperationBgpEmpty;

    beforeEach(() => {
      actor = new ActorQueryOperationBgpEmpty({ name: 'actor', bus });
    });

    it('should test on empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: []}};
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should not test on non-empty BGPs', () => {
      const op = { operation: { type: 'bgp', patterns: [ 'abc' ]}};
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should run on an empty BGP', () => {
      const op = { operation: { type: 'bgp', patterns: []}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([ Bindings({}) ]);
        expect(output.variables).toEqual([]);
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 1 });
      });
    });

    it('should run on a non-empty BGP', () => {
      const op = { operation: { type: 'bgp',
        patterns: [
          factory.createPattern(variable('s1'), namedNode('p1'), namedNode('o1')),
          factory.createPattern(namedNode('s2'), namedNode('p2'), variable('o2')),
        ]}};
      return actor.run(op).then(async(output: IActorQueryOperationOutputBindings) => {
        expect(await arrayifyStream(output.bindingsStream)).toEqual([ Bindings({}) ]);
        expect(output.variables).toEqual([ '?s1', '?o2' ]);
        expect(output.canContainUndefs).toEqual(false);
        expect(await (<any> output).metadata()).toMatchObject({ totalItems: 1 });
      });
    });
  });
});
