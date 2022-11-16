import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorOptimizeQueryOperationJoinConnected } from '../lib/ActorOptimizeQueryOperationJoinConnected';

const factory = new Factory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationJoinConnected', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorOptimizeQueryOperationJoinConnected instance', () => {
    let actor: ActorOptimizeQueryOperationJoinConnected;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationJoinConnected({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ operation: <any> undefined, context })).resolves.toBeTruthy();
    });

    it('should run', () => {
      const operation = factory.createJoin([
        factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
        factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),

        factory.createPattern(DF.variable('s1x'), DF.namedNode('p1'), DF.variable('s2x')),
        factory.createPattern(DF.variable('s2x'), DF.namedNode('p2'), DF.variable('s3x')),
      ]);
      return expect(actor.run({ operation, context })).resolves.toEqual({
        context,
        operation: factory.createJoin([
          factory.createJoin([
            factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
            factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
          ]),
          factory.createJoin([
            factory.createPattern(DF.variable('s1x'), DF.namedNode('p1'), DF.variable('s2x')),
            factory.createPattern(DF.variable('s2x'), DF.namedNode('p2'), DF.variable('s3x')),
          ]),
        ], false),
      });
    });

    describe('cluster', () => {
      it('should handle empty join entries', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([]), factory))
          .toEqual(factory.createJoin([]));
      });

      it('should handle a single entry', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ]));
      });

      it('should handle two entries without variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createJoin([
              factory.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
            ]),
          ], false));
      });

      it('should handle two entries with non-overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('o1')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('o2')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createJoin([
              factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('o1')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('o2')),
            ]),
          ], false));
      });

      it('should handle two entries with overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
          factory.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
            factory.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
          ]));
      });

      it('should handle three entries with non-overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('o1')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('o2')),
          factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('o3')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createJoin([
              factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('o1')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('o2')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('o3')),
            ]),
          ], false));
      });

      it('should handle three entries with overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
          factory.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
          factory.createPattern(DF.variable('s'), DF.namedNode('p3'), DF.variable('o3')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o1')),
            factory.createPattern(DF.variable('s'), DF.namedNode('p2'), DF.variable('o2')),
            factory.createPattern(DF.variable('s'), DF.namedNode('p3'), DF.variable('o3')),
          ]));
      });

      it('should handle three entries with indirectly overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
          factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('s4')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
            factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
            factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('s4')),
          ]));
      });

      it('should handle three entries with indirectly unsorted overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
          factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('s4')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
            factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
            factory.createPattern(DF.variable('s3'), DF.namedNode('p3'), DF.variable('s4')),
          ]));
      });

      it('should handle three entries with partially overlapping variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
          factory.createPattern(DF.variable('s3x'), DF.namedNode('p3'), DF.variable('s4')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createJoin([
              factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
              factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.variable('s3x'), DF.namedNode('p3'), DF.variable('s4')),
            ]),
          ], false));
      });

      it('should handle two distinct groups', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.cluster(factory.createJoin([
          factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
          factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),

          factory.createPattern(DF.variable('s1x'), DF.namedNode('p1'), DF.variable('s2x')),
          factory.createPattern(DF.variable('s2x'), DF.namedNode('p2'), DF.variable('s3x')),
        ]), factory))
          .toEqual(factory.createJoin([
            factory.createJoin([
              factory.createPattern(DF.variable('s1'), DF.namedNode('p1'), DF.variable('s2')),
              factory.createPattern(DF.variable('s2'), DF.namedNode('p2'), DF.variable('s3')),
            ]),
            factory.createJoin([
              factory.createPattern(DF.variable('s1x'), DF.namedNode('p1'), DF.variable('s2x')),
              factory.createPattern(DF.variable('s2x'), DF.namedNode('p2'), DF.variable('s3x')),
            ]),
          ], false));
      });
    });

    describe('haveOverlappingVariables', () => {
      it('should be false for empty objects', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables({}, {}))
          .toBeFalsy();
      });

      it('should be false for non-overlapping objects', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a1: true, b1: true },
          { a2: true, b2: true },
        )).toBeFalsy();
      });

      it('should be true for equal objects', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a: true },
          { a: true },
        )).toBeTruthy();
      });

      it('should be true when b is part of a', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a: true, b: true },
          { a: true },
        )).toBeTruthy();
      });

      it('should be true when a is part of b', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a: true },
          { a: true, b: true },
        )).toBeTruthy();
      });

      it('should be true when b is part of a and has other variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a: true, b: true },
          { a: true, c: true },
        )).toBeTruthy();
      });

      it('should be true when a is part of b and has other variables', () => {
        expect(ActorOptimizeQueryOperationJoinConnected.haveOverlappingVariables(
          { a: true, c: true },
          { a: true, b: true },
        )).toBeTruthy();
      });
    });
  });
});
