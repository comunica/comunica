import {ActorOptimizeQueryOperation} from "@comunica/bus-optimize-query-operation";
import {Bus} from "@comunica/core";
import {namedNode} from "@rdfjs/data-model";
import {Factory} from "sparqlalgebrajs";
import {ActorOptimizeQueryOperationJoinBgp} from "../lib/ActorOptimizeQueryOperationJoinBgp";

describe('ActorOptimizeQueryOperationJoinBgp', () => {
  let bus;
  let factory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    factory = new Factory();
  });

  describe('The ActorOptimizeQueryOperationJoinBgp module', () => {
    it('should be a function', () => {
      expect(ActorOptimizeQueryOperationJoinBgp).toBeInstanceOf(Function);
    });

    it('should be a ActorOptimizeQueryOperationJoinBgp constructor', () => {
      expect(new (<any> ActorOptimizeQueryOperationJoinBgp)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorOptimizeQueryOperationJoinBgp);
      expect(new (<any> ActorOptimizeQueryOperationJoinBgp)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorOptimizeQueryOperation);
    });

    it('should not be able to create new ActorOptimizeQueryOperationJoinBgp objects without \'new\'', () => {
      expect(() => { (<any> ActorOptimizeQueryOperationJoinBgp)(); }).toThrow();
    });
  });

  describe('An ActorOptimizeQueryOperationJoinBgp instance', () => {
    let actor: ActorOptimizeQueryOperationJoinBgp;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationJoinBgp({ name: 'actor', bus });
    });

    it('should always test', () => {
      return expect(actor.test({ operation: null })).resolves.toBeTruthy();
    });

    it('should run on and not modify a BGP', () => {
      const operation = factory.createBgp([
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      ]);
      return expect(actor.run({ operation })).resolves.toMatchObject({ operation });
    });

    it('should run on and not modify a join without inner BGPs', () => {
      const operation = factory.createJoin(
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      );
      return expect(actor.run({ operation })).resolves.toMatchObject({ operation });
    });

    it('should run on and not modify a join without left BGP', () => {
      const bgp1 = factory.createBgp([
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      ]);
      const operation = factory.createJoin(
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        bgp1,
      );
      return expect(actor.run({ operation })).resolves.toMatchObject({ operation });
    });

    it('should run on and not modify a join without right BGP', () => {
      const bgp1 = factory.createBgp([
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      ]);
      const operation = factory.createJoin(
        bgp1,
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      );
      return expect(actor.run({ operation })).resolves.toMatchObject({ operation });
    });

    it('should run on and modify a join with left and right BGP', () => {
      const bgp1 = factory.createBgp([
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
      ]);
      const bgp2 = factory.createBgp([
        factory.createPattern(namedNode('s3'), namedNode('p3'), namedNode('o3')),
        factory.createPattern(namedNode('s4'), namedNode('p4'), namedNode('o4')),
      ]);
      const operation = factory.createJoin(
        bgp1,
        bgp2,
      );
      const operationOut = factory.createBgp([
        factory.createPattern(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        factory.createPattern(namedNode('s2'), namedNode('p2'), namedNode('o2')),
        factory.createPattern(namedNode('s3'), namedNode('p3'), namedNode('o3')),
        factory.createPattern(namedNode('s4'), namedNode('p4'), namedNode('o4')),
      ]);
      return expect(actor.run({ operation })).resolves.toMatchObject({ operation: operationOut });
    });
  });
});
