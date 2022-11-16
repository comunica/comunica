import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorOptimizeQueryOperationBgpToJoin } from '../lib/ActorOptimizeQueryOperationBgpToJoin';

const DF = new DataFactory();

describe('ActorOptimizeQueryOperationBgpToJoin', () => {
  let bus: any;
  let factory: Factory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    factory = new Factory();
  });

  describe('An ActorOptimizeQueryOperationBgpToJoin instance', () => {
    let actor: ActorOptimizeQueryOperationBgpToJoin;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationBgpToJoin({ name: 'actor', bus });
      context = new ActionContext();
    });

    it('should test', () => {
      return expect(actor.test({ operation: <any> undefined, context })).resolves.toBeTruthy();
    });

    it('should run for a bgp', () => {
      const operation = factory.createBgp([
        factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
      const operationOut = factory.createJoin([
        factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
      ]);
      return expect(actor.run({ operation, context })).resolves.toMatchObject({ operation: operationOut });
    });

    it('should run for an inner bgp', () => {
      const operation = factory.createProject(
        factory.createBgp([
          factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]),
        [],
      );
      const operationOut = factory.createProject(
        factory.createJoin([
          factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]),
        [],
      );
      return expect(actor.run({ operation, context })).resolves.toMatchObject({ operation: operationOut });
    });
  });
});
