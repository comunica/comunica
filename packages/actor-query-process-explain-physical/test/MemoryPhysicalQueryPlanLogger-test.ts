import type { IPhysicalQueryPlanNode, IQuerySource } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { assignOperationSource } from '@comunica/utils-query-operation';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { MemoryPhysicalQueryPlanLogger } from '../lib/MemoryPhysicalQueryPlanLogger';

const factory = new AlgebraFactory();
const DF = new DataFactory();

describe('MemoryPhysicalQueryPlanLogger', () => {
  let logger: MemoryPhysicalQueryPlanLogger;
  /**
   * Plan nodes by the operation they were logged for, so that tests can refer to a parent
   * by its operation instead of having to thread node handles through every call.
   */
  let nodes: Map<any, IPhysicalQueryPlanNode>;

  beforeEach(() => {
    logger = new MemoryPhysicalQueryPlanLogger();
    nodes = new Map();
  });

  function logOperation(
    logicalOperator: string,
    physicalOperator: string | undefined,
    operation: any,
    parentOperation: any,
    actor: string,
    metadata: any,
  ): IPhysicalQueryPlanNode {
    const node = logger.logOperation({
      logicalOperator,
      physicalOperator,
      parentNode: parentOperation === undefined ? undefined : nodes.get(parentOperation),
      actor,
      metadata,
      operation,
    });
    nodes.set(operation, node);
    return node;
  }

  /**
   * Consume the given stream, so that it reaches its end like it would during query execution.
   */
  async function consume(stream: any): Promise<void> {
    stream.on('data', () => {
      // Go into flow-mode.
    });
    await new Promise(resolve => stream.on('end', resolve));
  }

  function createPattern(suffix = '1', graph = DF.namedNode(`ex:g${suffix}`)): any {
    return factory.createPattern(
      DF.namedNode(`ex:s${suffix}`),
      DF.namedNode(`ex:p${suffix}`),
      DF.variable(`o${suffix}`),
      graph,
    );
  }

  describe('logOperation', () => {
    it('throws when referencing a parent without a root being set', () => {
      const orphan = logger.logOperation({ logicalOperator: 'pattern', actor: 'actor-pattern' });
      const otherLogger = new MemoryPhysicalQueryPlanLogger();

      expect(() => otherLogger.logOperation({
        logicalOperator: 'pattern',
        parentNode: orphan,
        actor: 'actor-pattern',
      })).toThrow('No root node has been set yet, while a parent is being referenced');
    });

    it('throws when referencing no parent while a root was already set', () => {
      logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});

      expect(() => logger.logOperation({ logicalOperator: 'pattern', actor: 'actor-pattern' }))
        .toThrow('Detected more than one parent-less node');
    });

    it('creates a separate node each time the same operation is logged', () => {
      const operation = createPattern();
      const root = logOperation('join', undefined, {}, undefined, 'actor-join', {});
      const first = logger.logOperation({
        logicalOperator: 'pattern',
        parentNode: root,
        actor: 'actor-pattern',
        operation,
      });
      const second = logger.logOperation({
        logicalOperator: 'pattern',
        parentNode: root,
        actor: 'actor-pattern',
        operation,
      });

      expect(first).not.toBe(second);
      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          { logical: 'pattern', pattern: 'ex:s1 ex:p1 ?o1 ex:g1' },
          { logical: 'pattern', pattern: 'ex:s1 ex:p1 ?o1 ex:g1' },
        ],
      });
    });
  });

  describe('getNodeForOutput', () => {
    it('returns undefined for an unknown output', () => {
      expect(logger.getNodeForOutput({})).toBeUndefined();
    });

    it('returns undefined for a non-object output', () => {
      expect(logger.getNodeForOutput('abc')).toBeUndefined();
      expect(logger.getNodeForOutput(undefined)).toBeUndefined();
    });

    it('returns the node that set the output', () => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});
      const output = {};
      node.setOutput(output);

      expect(logger.getNodeForOutput(output)).toBe(node);
    });

    it('ignores a non-object output', () => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});
      node.setOutput('abc');

      expect(logger.getNodeForOutput('abc')).toBeUndefined();
    });
  });

  describe('setOutput', () => {
    it('measures an output stream', async() => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});
      const bindingsStream = new ArrayIterator([ 'a', 'b' ], { autoStart: false });
      node.setOutput({
        bindingsStream,
        metadata: () => Promise.resolve({ cardinality: { type: 'exact', value: 2 }}),
      });
      await consume(bindingsStream);
      await logger.finalize();

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
        cardinality: { type: 'exact', value: 2 },
        cardinalityReal: 2,
        timeSelf: expect.any(Number),
        timeLife: expect.any(Number),
      });
    });

    it('keeps a cardinality that was already recorded', async() => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {
        cardinality: { type: 'estimate', value: 10 },
      });
      const bindingsStream = new ArrayIterator([ 'a' ], { autoStart: false });
      node.setOutput({
        bindingsStream,
        metadata: () => Promise.resolve({ cardinality: { type: 'exact', value: 1 }}),
      });
      await consume(bindingsStream);
      await logger.finalize();

      expect(logger.toJson()).toMatchObject({ cardinality: { type: 'estimate', value: 10 }});
    });

    it('reports an output that was never consumed', async() => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});
      node.setOutput({
        bindingsStream: new BufferedIterator({ autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: { type: 'exact', value: 0 }}),
      });
      await logger.finalize();

      expect(logger.toJson()).toMatchObject({ streamState: 'unfinished' });
      expect(logger.toJson()).not.toHaveProperty('cardinality');
    });

    it('ignores an output whose metadata rejects', async() => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', {});
      const bindingsStream = new ArrayIterator([ 'a' ], { autoStart: false });
      node.setOutput({
        bindingsStream,
        metadata: () => Promise.reject(new Error('Metadata failure')),
      });
      await consume(bindingsStream);
      await logger.finalize();

      expect(logger.toJson()).not.toHaveProperty('cardinality');
    });

    it('ignores an output without a stream', async() => {
      const node = logOperation('ask', undefined, {}, undefined, 'actor-ask', {});
      node.setOutput({ execute: () => Promise.resolve(true) });
      await logger.finalize();

      expect(logger.toJson()).toEqual({ logical: 'ask' });
    });

    it('measures a quad stream', async() => {
      const node = logOperation('construct', undefined, {}, undefined, 'actor-construct', {});
      const quadStream = new ArrayIterator([ 'a' ], { autoStart: false });
      node.setOutput({
        quadStream,
        metadata: () => Promise.resolve({ cardinality: { type: 'exact', value: 1 }}),
      });
      await consume(quadStream);
      await logger.finalize();

      expect(logger.toJson()).toMatchObject({ cardinalityReal: 1 });
    });
  });

  describe('adoptInput', () => {
    it('moves a node to another parent', () => {
      const rootOperation = {};
      logOperation('join', undefined, rootOperation, undefined, 'actor-join', {});
      const child = logOperation('pattern', undefined, createPattern('1'), rootOperation, 'actor-pattern', {});
      const newParent = logOperation('join', 'hash', {}, rootOperation, 'actor-join-hash', {});

      newParent.adoptInput(child);

      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          {
            logical: 'join',
            physical: 'hash',
            children: [
              { logical: 'pattern', pattern: 'ex:s1 ex:p1 ?o1 ex:g1' },
            ],
          },
        ],
      });
    });

    it('is a no-op when the node is already a child of the given parent', () => {
      const rootOperation = {};
      logOperation('join', undefined, rootOperation, undefined, 'actor-join', {});
      const child = logOperation('pattern', undefined, createPattern('1'), rootOperation, 'actor-pattern', {});

      nodes.get(rootOperation)!.adoptInput(child);
      nodes.get(rootOperation)!.adoptInput(child);

      expect(logger.toJson()).toEqual({
        logical: 'join',
        children: [
          { logical: 'pattern', pattern: 'ex:s1 ex:p1 ?o1 ex:g1' },
        ],
      });
    });
  });

  describe('appendMetadata', () => {
    it('adds metadata to a node', () => {
      const node = logOperation('pattern', undefined, createPattern(), undefined, 'actor-pattern', { b: 1 });

      node.appendMetadata({ a: true });

      expect(logger.toJson()).toEqual({
        logical: 'pattern',
        pattern: 'ex:s1 ex:p1 ?o1 ex:g1',
        a: true,
        b: 1,
      });
    });

    it('defaults to empty metadata', () => {
      const node = logger.logOperation({ logicalOperator: 'pattern', actor: 'actor-pattern' });

      node.appendMetadata({ a: true });

      expect(logger.toJson()).toEqual({ logical: 'pattern', a: true });
    });
  });

  describe('toJson', () => {
    it('for an empty sequence', () => {
      expect(logger.toJson()).toEqual({});
    });

    it('for a single pattern', () => {
      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
        'bgp',
        undefined,
        bgpNode,
        undefined,
        'actor-bgp',
        {},
      );
      logOperation(
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
      logOperation(
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
      logOperation(
        'project',
        undefined,
        projectNode,
        undefined,
        'actor-bgp',
        {},
      );

      const bgpNode = {};
      logOperation(
        'bgp',
        undefined,
        bgpNode,
        projectNode,
        'actor-bgp',
        {},
      );
      logOperation(
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
      logOperation(
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
      logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode3,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {},
      );

      const subJoinNode1 = {};
      logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      const subBjNode1 = {};
      logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        subJoinNode2,
        'actor-bind',
        {},
      );

      const subSubJoinNode1 = {};
      logOperation(
        'join',
        undefined,
        subSubJoinNode1,
        subBjNode1,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logOperation(
        'join-inner',
        'bind',
        bjNode,
        joinNode,
        'actor-bind',
        {},
      );

      logOperation(
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
      logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        bjNode,
        'actor-bind',
        {},
      );

      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
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
      logOperation(
        'bgp',
        undefined,
        bgpNode,
        undefined,
        'actor-bgp',
        {},
      );
      logOperation(
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
      logOperation(
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
      logOperation(
        'project',
        undefined,
        projectNode,
        undefined,
        'actor-bgp',
        {},
      );

      const bgpNode = {};
      logOperation(
        'bgp',
        undefined,
        bgpNode,
        projectNode,
        'actor-bgp',
        {},
      );
      logOperation(
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
      logOperation(
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
      logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode3,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        joinNode,
        undefined,
        'actor-join',
        {},
      );

      const bjNode = {};
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode1,
        bjNode,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'join',
        undefined,
        subJoinNode2,
        bjNode,
        'actor-join',
        {},
      );
      const subBjNode1 = {};
      logOperation(
        'join-inner',
        'bind',
        subBjNode1,
        subJoinNode2,
        'actor-bind',
        {},
      );

      const subSubJoinNode1 = {};
      logOperation(
        'join',
        undefined,
        subSubJoinNode1,
        subBjNode1,
        'actor-join',
        {},
      );
      logOperation(
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
      logOperation(
        'pattern',
        undefined,
        parent,
        undefined,
        'actor-pattern',
        {},
      );
      logOperation(
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
      logOperation(
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
