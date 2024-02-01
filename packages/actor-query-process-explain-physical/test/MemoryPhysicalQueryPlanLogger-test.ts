import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { MemoryPhysicalQueryPlanLogger } from '../lib/MemoryPhysicalQueryPlanLogger';

const factory = new Factory();
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
      )).toThrowError('No root node has been set yet, while a parent is being referenced');
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
      )).toThrowError('Detected more than one parent-less node');
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
      )).toThrowError('Could not find parent node');
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
  });
});
