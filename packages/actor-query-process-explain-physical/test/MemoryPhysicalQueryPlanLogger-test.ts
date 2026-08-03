import type { IQuerySource } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { MemoryPhysicalQueryPlanLogger } from '../lib/MemoryPhysicalQueryPlanLogger';

const factory = new AlgebraFactory();
const DF = new DataFactory();

describe('MemoryPhysicalQueryPlanLogger', () => {
  let logger: MemoryPhysicalQueryPlanLogger;
  beforeEach(() => {
    logger = new MemoryPhysicalQueryPlanLogger();
  });

  describe('logOperation with invalid sequences', () => {
    it('referencing a parent without a root being set', () => {
      expect(() => logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        {},
        'actor-pattern',
        {},
      )).toThrow('No root node has been set yet, while a parent is being referenced');
    });

    it('referencing no parent while a root was already set', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(() => logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {},
      )).toThrow('Detected more than one parent-less node');
    });

    it('referencing an unknown parent', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(() => logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        {},
        'actor-pattern',
        {},
      )).toThrow('Could not find parent node');
    });
  });

  describe('stashChildren', () => {
    it('throws for a non-existing parent node', () => {
      expect(() => logger.stashChildren({})).toThrow(`Could not find plan node`);
    });

    it('removes children', () => {
      const root = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        root,
        undefined,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        {},
        root,
        'actor-sub',
        {},
      );

      logger.stashChildren(root);

      expect((<any> logger).rootNode.children).toHaveLength(0);
    });

    it('removes children with filter', () => {
      const root = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        root,
        undefined,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        {},
        root,
        'actor-sub',
        {},
      );

      logger.stashChildren(root, () => false);

      expect((<any> logger).rootNode.children).toHaveLength(0);
    });
  });

  describe('unstashChild', () => {
    it('ignores a non-existing node', () => {
      expect(() => logger.unstashChild({}, {})).not.toThrow();
    });

    it('throws for a non-existing parent node', () => {
      const root = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        root,
        undefined,
        'actor-pattern',
        {},
      );

      expect(() => logger.unstashChild(root, {})).toThrow(`Could not find plan parent node`);
    });

    it('adds node to parent', () => {
      const root = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        root,
        undefined,
        'actor-pattern',
        {},
      );

      const child = factory.createPattern(
        DF.namedNode('ex:s1C'),
        DF.namedNode('ex:p1C'),
        DF.variable('o1C'),
        DF.namedNode('ex:g1C'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        child,
        root,
        'actor-pattern',
        {},
      );

      logger.stashChildren(root);
      expect((<any> logger).rootNode.children).toHaveLength(0);
      logger.unstashChild(child, root);
      expect((<any> logger).rootNode.children).toHaveLength(1);
    });
  });

  describe('appendMetadata', () => {
    it('ignores a non-existing node', () => {
      expect(() => logger.appendMetadata({}, {})).not.toThrow();
    });

    it('adds metadata to a node', () => {
      const root = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        root,
        undefined,
        'actor-pattern',
        { b: 1 },
      );

      logger.appendMetadata(root, { a: true });
      expect((<any> logger).rootNode.metadata).toEqual({ a: true, b: 1 });
    });
  });

  describe('toJson', () => {
    it('for an empty sequence', () => {
      expect(logger.toJson()).toEqual({});
    });

    it('for a single pattern', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
      });
    });

    it('for a single pattern with source', () => {
      logger.logOperation(
        'pattern',
        undefined,
        assignOperationSource(
          factory.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.variable('o1'),
            DF.namedNode('ex:g1'),
          ),
          { source: <IQuerySource> { toString: () => 'SRC' }},
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
        source: 'SRC',
      });
    });

    it('for a single pattern in the default graph', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.defaultGraph(),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1',
      });
    });

    it('for a single pattern with metadata', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {
          metaKey: 'metaValue',
        },
      );

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
        metaKey: 'metaValue',
      });
    });

    it('for a BGP and patterns', () => {
      const bgpNode = {};
      logger.logOperation(
        'bgp',
        undefined,
        bgpNode,
        undefined,
        'actor-bgp',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'bgp',
        children: [
          {
            logical: 'pattern',
            pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
          },
          {
            logical: 'pattern',
            pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
          },
        ],
      });
    });

    it('for a project, BGP and patterns', () => {
      const projectNode = factory.createProject(<any> undefined, [
        DF.variable('varA'),
        DF.variable('varB'),
      ]);
      logger.logOperation(
        'project',
        undefined,
        projectNode,
        undefined,
        'actor-bgp',
        {},
      );

      const bgpNode = {};
      logger.logOperation(
        'bgp',
        undefined,
        bgpNode,
        projectNode,
        'actor-bgp',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'project',
        variables: [
          'varA',
          'varB',
        ],
        children: [
          {
            logical: 'bgp',
            children: [
              {
                logical: 'pattern',
                pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
              },
              {
                logical: 'pattern',
                pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
              },
            ],
          },
        ],
      });
    });

    it('for a bind join', () => {
      const joinNode = factory.createJoin([]);
      logger.logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logger.logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {
          bindOperation: factory.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:p2'),
            DF.variable('o2'),
            DF.namedNode('ex:g2'),
          ),
        },
      );

      const subJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode1,
        'actor-pattern',
        {},
      );

      const subJoinNode2 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode2,
        'actor-pattern',
        {},
      );

      const subJoinNode3 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode3,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'bgp',
        undefined,
        factory.createBgp([]),
        subJoinNode3,
        'actor-bgp',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          {
            logical: 'join-inner',
            physical: 'bind',
            bindOperation: {
              pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
            },
            childrenCompact: [
              {
                occurrences: 2,
                firstOccurrence: {
                  children: [
                    {
                      logical: 'pattern',
                      pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
                    },
                  ],
                  logical: 'join',
                },
              },
              {
                occurrences: 1,
                firstOccurrence: {
                  children: [
                    {
                      logical: 'bgp',
                    },
                  ],
                  logical: 'join',
                },
              },
            ],
          },
        ],
      });
    });

    it('for a bind join with nesting', () => {
      const joinNode = factory.createJoin([]);
      logger.logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logger.logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {},
      );

      const subJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode1,
        'actor-pattern',
        {},
      );

      const subJoinNode2 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      const subBjNode1 = {};
      logger.logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        subJoinNode2,
        'actor-bind',
        {},
      );

      const subSubJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subSubJoinNode1,
        subBjNode1,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subSubJoinNode1,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          {
            logical: 'join-inner',
            physical: 'bind',
            childrenCompact: [
              {
                occurrences: 1,
                firstOccurrence: {
                  logical: 'join',
                  children: [
                    {
                      logical: 'pattern',
                      pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
                    },
                  ],
                },
              },
              {
                occurrences: 1,
                firstOccurrence: {
                  children: [
                    {
                      logical: 'join-inner',
                      physical: 'bind',
                      childrenCompact: [
                        {
                          occurrences: 1,
                          firstOccurrence: {
                            logical: 'join',
                            children: [
                              {
                                logical: 'pattern',
                                pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                  logical: 'join',
                },
              },
            ],
          },
        ],
      });
    });

    it('for a bind join with nesting without intermediary join node', () => {
      const joinNode = factory.createJoin([]);
      logger.logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logger.logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {},
      );

      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bjNode,
        'actor-pattern',
        {},
      );

      const subBjNode1 = {};
      logger.logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        bjNode,
        'actor-bind',
        {},
      );

      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bjNode,
        'actor-pattern',
        {},
      );

      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          {
            logical: 'join-inner',
            physical: 'bind',
            childrenCompact: [
              {
                occurrences: 2,
                firstOccurrence: {
                  logical: 'pattern',
                  pattern: 'ex:s2 ex:p2 ?o2 ex:g2',
                },
              },
              {
                occurrences: 1,
                firstOccurrence: {
                  logical: 'join-inner',
                  physical: 'bind',
                },
              },
            ],
          },
        ],
      });
    });
  });

  describe('toCompactString', () => {
    it('for an empty sequence', () => {
      expect(logger.toCompactString()).toBe('Empty');
    });

    it('for a single pattern', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe('pattern (ex:s1 ex:p1 ?o1 ex:g1)');
    });

    it('for a single pattern with source', () => {
      logger.logOperation(
        'pattern',
        undefined,
        assignOperationSource(
          factory.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.variable('o1'),
            DF.namedNode('ex:g1'),
          ),
          { source: <IQuerySource> { toString: () => 'SRC' }},
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe(`pattern (ex:s1 ex:p1 ?o1 ex:g1) src:0

sources:
  0: SRC`);
    });

    it('for a single pattern in the default graph', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.defaultGraph(),
        ),
        undefined,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe('pattern (ex:s1 ex:p1 ?o1)');
    });

    it('for a single pattern with metadata', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {
          metaKey: 'metaValue',
          cardinality: { type: 'estimate', value: 3 },
          cardinalityReal: 1,
          timeSelf: 0.12345,
          timeLife: 0.6789,
        },
      );

      expect(logger.toCompactString()).toBe(`pattern (ex:s1 ex:p1 ?o1 ex:g1) cardEst:~3 cardReal:1 timeSelf:0.123ms timeLife:0.679ms`);
    });

    it('for a single pattern with metadata and exact cardinality', () => {
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        undefined,
        'actor-pattern',
        {
          metaKey: 'metaValue',
          cardinality: { type: 'exact', value: 3 },
        },
      );

      expect(logger.toCompactString()).toBe('pattern (ex:s1 ex:p1 ?o1 ex:g1) cardEst:3');
    });

    it('for a BGP and patterns', () => {
      const bgpNode = {};
      logger.logOperation(
        'bgp',
        undefined,
        bgpNode,
        undefined,
        'actor-bgp',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe(`bgp
  pattern (ex:s1 ex:p1 ?o1 ex:g1)
  pattern (ex:s2 ex:p2 ?o2 ex:g2)`);
    });

    it('for a project, BGP and patterns', () => {
      const projectNode = factory.createProject(<any> undefined, [
        DF.variable('varA'),
        DF.variable('varB'),
      ]);
      logger.logOperation(
        'project',
        undefined,
        projectNode,
        undefined,
        'actor-bgp',
        {},
      );

      const bgpNode = {};
      logger.logOperation(
        'bgp',
        undefined,
        bgpNode,
        projectNode,
        'actor-bgp',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s1'),
          DF.namedNode('ex:p1'),
          DF.variable('o1'),
          DF.namedNode('ex:g1'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        bgpNode,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe(`project (varA,varB)
  bgp
    pattern (ex:s1 ex:p1 ?o1 ex:g1)
    pattern (ex:s2 ex:p2 ?o2 ex:g2)`);
    });

    it('for a bind join', () => {
      const joinNode = factory.createJoin([]);
      logger.logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logger.logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {
          bindOperation: factory.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:p2'),
            DF.variable('o2'),
            DF.namedNode('ex:g2'),
          ),
          bindOperationCardinality: { type: 'estimate', value: 3 },
        },
      );

      const subJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode1,
        'actor-pattern',
        {},
      );

      const subJoinNode2 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode2,
        'actor-pattern',
        {},
      );

      const subJoinNode3 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode3,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'bgp',
        undefined,
        factory.createBgp([]),
        subJoinNode3,
        'actor-bgp',
        {},
      );

      expect(logger.toCompactString()).toBe(`join
  join-inner(bind) bindOperation:(ex:s2 ex:p2 ?o2 ex:g2) bindCardEst:~3
    join compacted-occurrences:2
      pattern (ex:s2 ex:p2 ?o2 ex:g2)
    join compacted-occurrences:1
      bgp`);
    });

    it('for a bind join with nesting', () => {
      const joinNode = factory.createJoin([]);
      logger.logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logger.logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {
          bindOperation: factory.createPattern(
            DF.namedNode('ex:s2'),
            DF.namedNode('ex:p2'),
            DF.variable('o2'),
            DF.namedNode('ex:g2'),
          ),
          bindOperationCardinality: { type: 'exact', value: 3 },
        },
      );

      const subJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subJoinNode1,
        'actor-pattern',
        {},
      );

      const subJoinNode2 = {};
      logger.logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      const subBjNode1 = {};
      logger.logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        subJoinNode2,
        'actor-bind',
        {},
      );

      const subSubJoinNode1 = {};
      logger.logOperation(
        'join',
        undefined,
        subSubJoinNode1,
        subBjNode1,
        'actor-join',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        factory.createPattern(
          DF.namedNode('ex:s2'),
          DF.namedNode('ex:p2'),
          DF.variable('o2'),
          DF.namedNode('ex:g2'),
        ),
        subSubJoinNode1,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe(`join
  join-inner(bind) bindOperation:(ex:s2 ex:p2 ?o2 ex:g2) bindCardEst:3
    join compacted-occurrences:1
      pattern (ex:s2 ex:p2 ?o2 ex:g2)
    join compacted-occurrences:1
      join-inner(bind)
        join compacted-occurrences:1
          pattern (ex:s2 ex:p2 ?o2 ex:g2)`);
    });

    it('for two patterns with the same source', () => {
      const source = <IQuerySource> { toString: () => 'SRC' };
      const parent = factory.createPattern(
        DF.namedNode('ex:s1'),
        DF.namedNode('ex:p1'),
        DF.variable('o1'),
        DF.namedNode('ex:g1'),
      );
      logger.logOperation(
        'pattern',
        undefined,
        parent,
        undefined,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        assignOperationSource(
          factory.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.variable('o1'),
            DF.namedNode('ex:g1'),
          ),
          { source },
        ),
        parent,
        'actor-pattern',
        {},
      );
      logger.logOperation(
        'pattern',
        undefined,
        assignOperationSource(
          factory.createPattern(
            DF.namedNode('ex:s1'),
            DF.namedNode('ex:p1'),
            DF.variable('o1'),
            DF.namedNode('ex:g1'),
          ),
          { source },
        ),
        parent,
        'actor-pattern',
        {},
      );

      expect(logger.toCompactString()).toBe(`pattern (ex:s1 ex:p1 ?o1 ex:g1)
  pattern (ex:s1 ex:p1 ?o1 ex:g1) src:0
  pattern (ex:s1 ex:p1 ?o1 ex:g1) src:0

sources:
  0: SRC`);
    });
  });
});
