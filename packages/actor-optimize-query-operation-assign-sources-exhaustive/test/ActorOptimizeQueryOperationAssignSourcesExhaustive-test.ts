import { KeysInitQuery, KeysQueryOperation, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { FragmentSelectorShape, IQuerySourceWrapper, ServiceExecutor } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';
import { DataFactory } from 'rdf-data-factory';
import {
  ActorOptimizeQueryOperationAssignSourcesExhaustive,
} from '../lib/ActorOptimizeQueryOperationAssignSourcesExhaustive';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

describe('ActorOptimizeQueryOperationAssignSourcesExhaustive', () => {
  let bus: any;

  const source1: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'wildcard',
        },
      }),
    },
  };
  const sourcePattern: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'source1',
      getSelectorShape: () => ({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: Algebra.Types.PATTERN,
        },
      }),
    },
  };
  const shapeService: FragmentSelectorShape = {
    type: 'operation',
    operation: { operationType: 'type', type: Algebra.Types.SERVICE },
    children: [{ type: 'operation', operation: { operationType: 'wildcard' }}],
  };
  const sourceService: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'sourceService',
      getSelectorShape: () => shapeService,
    },
  };
  const sourceUnreachable: IQuerySourceWrapper = <any> {
    source: {
      referenceValue: 'sourceUnreachable',
      getSelectorShape: () => Promise.reject(new Error('Unreachable source')),
    },
  };
  const pattern = AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'));
  const serviceExecutor: ServiceExecutor = async() => [];

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationAssignSourcesExhaustive instance', () => {
    let actor: ActorOptimizeQueryOperationAssignSourcesExhaustive;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationAssignSourcesExhaustive({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({
        operation: AF.createNop(),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('should pass operation for no sources', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
        });
        expect(operationOut).toBe(operationIn);
      });

      it('should pass operation for a zero-length sources array', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, []),
        });
        expect(operationOut).toBe(operationIn);
      });

      it('should globally assign operation to 1 source without destination that accepts the operation', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ]),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('should globally assign operation to 1 source with equal destination that accepts the operation', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysRdfUpdateQuads.destination, 'source1'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('should exhaustively assign operation to 1 source with non-equal destination', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysRdfUpdateQuads.destination, 'sourceOther'),
        });
        const operationOut = <Algebra.Bgp> operation;
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBeUndefined();
        expect(getOperationSource(operationOut.patterns[0])).toBe(source1);
        expect(getOperationSource(operationOut.patterns[1])).toBe(source1);
      });

      it('should exhaustively assign operation to 1 source without destination that rejects the operation', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, [ sourcePattern ]),
        });
        const operationOut = <Algebra.Bgp> operation;
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBeUndefined();
        expect(getOperationSource(operationOut.patterns[0])).toBe(sourcePattern);
        expect(getOperationSource(operationOut.patterns[1])).toBe(sourcePattern);
      });

      it('should exhaustively assign operation to 2 sources', async() => {
        const operationIn = AF.createBgp([
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          AF.createPattern(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        ]);
        const { operation } = await actor.run({
          operation: operationIn,
          context: new ActionContext({
            [KeysInitQuery.dataFactory.name]: DF,
          }).set(KeysQueryOperation.querySources, [ source1, sourcePattern ]),
        });
        const operationOut = <Algebra.Bgp> operation;
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBeUndefined();
        expect(getOperationSource(operationOut.patterns[0])).toBeUndefined();
        expect(getOperationSource(operationOut.patterns[1])).toBeUndefined();
        expect(getOperationSource((<Algebra.Union><unknown>operationOut.patterns[0]).input[0])).toBe(source1);
        expect(getOperationSource((<Algebra.Union><unknown>operationOut.patterns[0]).input[1])).toBe(sourcePattern);
        expect(getOperationSource((<Algebra.Union><unknown>operationOut.patterns[1]).input[0])).toBe(source1);
        expect(getOperationSource((<Algebra.Union><unknown>operationOut.patterns[1]).input[1])).toBe(sourcePattern);
      });

      it('should not globally assign operation to 1 source if a SERVICE clause has a custom executor', async() => {
        const operationIn = AF.createJoin([
          pattern,
          AF.createService(pattern, DF.namedNode('sourceService')),
        ]);
        const { operation, context: contextOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysQueryOperation.serviceSources, { sourceService })
            .set(KeysInitQuery.serviceExecutors, { sourceService: serviceExecutor })
            .set(KeysInitQuery.queryString, 'abc'),
        });
        const operationOut = <Algebra.Join> operation;
        expect(getOperationSource(operationOut)).toBeUndefined();
        expect(getOperationSource(operationOut.input[0])).toBe(source1);
        expect(operationOut.input[1].type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut.input[1])).toBe(sourceService);
        expect(getOperationSource((<Algebra.Service> operationOut.input[1]).input)).toBeUndefined();
        expect(contextOut.get(KeysInitQuery.queryString)).toBeUndefined();
      });

      it('should assign SERVICE clauses evaluated as a whole next to the bodies of other SERVICE clauses', async() => {
        const operationIn = AF.createJoin([
          AF.createService(pattern, DF.namedNode('source1')),
          AF.createService(pattern, DF.namedNode('sourceService')),
        ]);
        const { operation } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysQueryOperation.serviceSources, { source1, sourceService })
            .set(KeysInitQuery.serviceExecutors, { sourceService: serviceExecutor }),
        });
        const operationOut = <Algebra.Join> operation;
        expect(operationOut.input[0].type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut.input[0])).toBe(source1);
        expect(operationOut.input[1].type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut.input[1])).toBe(sourceService);
      });

      it('should globally assign operation to 1 source if no SERVICE clause has a custom executor', async() => {
        const operationIn = AF.createJoin([
          pattern,
          AF.createService(pattern, DF.namedNode('source1')),
        ]);
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysQueryOperation.serviceSources, { source1 }),
        });
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('should not request the shapes of SERVICE sources when globally assigning operation to 1 source', async() => {
        const getSelectorShape = jest.fn(() => shapeService);
        const sourceSpy: IQuerySourceWrapper = <any> { source: { getSelectorShape }};
        const operationIn = AF.createJoin([
          pattern,
          AF.createService(pattern, DF.namedNode('sourceSpy')),
        ]);
        const { operation: operationOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysQueryOperation.serviceSources, { sourceSpy }),
        });
        expect(getOperationSource(operationOut)).toBe(source1);
        expect(getSelectorShape).not.toHaveBeenCalled();
      });

      it('should keep the queryString for a single source', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut, context: contextOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1 ])
            .set(KeysInitQuery.queryString, 'abc'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(getOperationSource(operationOut)).toBe(source1);
        expect(contextOut.get(KeysInitQuery.queryString)).toBe('abc');
      });

      it('should not keep the queryString for two sources', async() => {
        const operationIn = AF.createNop();
        const { operation: operationOut, context: contextOut } = await actor.run({
          operation: operationIn,
          context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF })
            .set(KeysQueryOperation.querySources, [ source1, source1 ])
            .set(KeysInitQuery.queryString, 'abc'),
        });
        expect(operationOut).not.toBe(operationIn);
        expect(contextOut.get(KeysInitQuery.queryString)).toBeUndefined();
      });
    });

    describe('assignExhaustive', () => {
      it('for pattern with one source', async() => {
        const operationIn = AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('for pattern with two sources', async() => {
        const operationIn = AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'));
        const operationOut = <Algebra.Union> actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ], {});
        expect(operationOut.type).toEqual(Algebra.Types.UNION);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.Types.PATTERN);
        expect(operationOut.input[1].type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut.input[0])).toBe(source1);
        expect(getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for link with one source', async() => {
        const operationIn = AF.createLink(DF.namedNode('p1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.LINK);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('for link with two sources', async() => {
        const operationIn = AF.createLink(DF.namedNode('p1'));
        const operationOut = <Algebra.Alt> actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ], {});
        expect(operationOut.type).toEqual(Algebra.Types.ALT);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.Types.LINK);
        expect(operationOut.input[1].type).toEqual(Algebra.Types.LINK);
        expect(getOperationSource(operationOut.input[0])).toBe(source1);
        expect(getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for nps with one source', async() => {
        const operationIn = AF.createNps([ DF.namedNode('p1'), DF.namedNode('p2') ]);
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.NPS);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('for nps with two sources', async() => {
        const operationIn = AF.createNps([ DF.namedNode('p1'), DF.namedNode('p2') ]);
        const operationOut = <Algebra.Alt> actor.assignExhaustive(AF, operationIn, [ source1, sourcePattern ], {});
        expect(operationOut.type).toEqual(Algebra.Types.ALT);
        expect(operationOut.input).toHaveLength(2);
        expect(operationOut.input[0].type).toEqual(Algebra.Types.NPS);
        expect(operationOut.input[1].type).toEqual(Algebra.Types.NPS);
        expect(getOperationSource(operationOut.input[0])).toBe(source1);
        expect(getOperationSource(operationOut.input[1])).toBe(sourcePattern);
      });

      it('for service with an unknown source should not assign', async() => {
        const operationIn = AF.createService(AF.createNop(), DF.namedNode('source1'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut)).toBeUndefined();
      });

      it('for service with a known source should assign', async() => {
        const operationIn = AF.createService(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.namedNode('source1'),
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { source1 });
        expect(operationOut.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut)).toBe(source1);
      });

      it('for service with silent with a known source should assign', async() => {
        const operationIn = AF.createService(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.namedNode('source1'),
          true,
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { source1 });
        expect(operationOut.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut)).not.toBe(source1);
        // Silent SERVICE clauses mark their target, so that its errors can be swallowed at execution time.
        expect(getOperationSource(operationOut)).toEqual({
          source: source1.source,
          context: new ActionContext({
            [KeysInitQuery.lenient.name]: true,
            [KeysQueryOperation.silent.name]: true,
          }),
        });
      });

      it('for service with silent and a source context with a known source should assign', async() => {
        source1.context = new ActionContext({ a: 'b' });
        const operationIn = AF.createService(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.namedNode('source1'),
          true,
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { source1 });
        expect(operationOut.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut)).not.toBe(source1);
        expect(getOperationSource(operationOut)).toEqual({
          source: source1.source,
          context: new ActionContext({
            [KeysInitQuery.lenient.name]: true,
            [KeysQueryOperation.silent.name]: true,
            a: 'b',
          }),
        });
      });

      it('for service with a known source should assign, and delegate nested service to it', async() => {
        const operationIn = AF.createService(
          AF.createJoin([
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
            AF.createService(
              AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
              DF.namedNode('source1'),
            ),
          ]),
          DF.namedNode('source1'),
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { source1 });
        expect(operationOut.type).toEqual(Algebra.Types.JOIN);
        expect(getOperationSource((<any> operationOut).input[0])).toBe(source1);
        // Nested SERVICE clauses are passed on as-is to the source of the enclosing SERVICE clause.
        expect((<any> operationOut).input[1].type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource((<any> operationOut).input[1])).toBe(source1);
      });

      it('for service with a known source that evaluates whole SERVICE clauses should assign the clause', async() => {
        const operationIn = AF.createService(pattern, DF.namedNode('sourceService'));
        const operationOut = actor.assignExhaustive(
          AF,
          operationIn,
          [ source1 ],
          { sourceService },
          false,
          new Set([ operationIn ]),
        );
        expect(operationOut.type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut)).toBe(sourceService);
        expect(getOperationSource((<Algebra.Service> operationOut).input)).toBeUndefined();
      });

      it('for silent service with a known whole-clause source should assign the clause', async() => {
        const operationIn = AF.createService(pattern, DF.namedNode('sourceService'), true);
        const operationOut = actor.assignExhaustive(
          AF,
          operationIn,
          [ source1 ],
          { sourceService },
          false,
          new Set([ operationIn ]),
        );
        expect(operationOut.type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut)).toEqual({
          source: sourceService.source,
          context: new ActionContext({
            [KeysInitQuery.lenient.name]: true,
            [KeysQueryOperation.silent.name]: true,
          }),
        });
      });

      it('for service with a known source that is not evaluated as a whole should assign the body', async() => {
        const operationIn = AF.createService(pattern, DF.namedNode('sourceService'));
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { sourceService });
        expect(operationOut.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut)).toBe(sourceService);
      });

      it('for service with variable should not assign', async() => {
        source1.context = new ActionContext({ a: 'b' });
        const operationIn = AF.createService(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.variable('source1'),
          true,
        );
        const operationOut = actor.assignExhaustive(AF, operationIn, [ source1 ], { source1 });
        expect(operationOut.type).toEqual(Algebra.Types.SERVICE);
        expect(getOperationSource(operationOut)).toBeUndefined();
      });

      it('for a construct query', async() => {
        const operationIn = AF.createConstruct(
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
        );
        const operationOut = <Algebra.Construct>actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.CONSTRUCT);
        expect(operationOut.input.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut.input)).toBe(source1);
      });

      it('for a delete-insert query', async() => {
        const operationIn = AF.createDeleteInsert(
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
          [
            AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          ],
          AF.createPattern(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        );
        const operationOut = <Algebra.DeleteInsert> actor.assignExhaustive(AF, operationIn, [ source1 ], {});
        expect(operationOut.type).toEqual(Algebra.Types.DELETE_INSERT);
        expect(operationOut.where!.type).toEqual(Algebra.Types.PATTERN);
        expect(getOperationSource(operationOut.delete![0])).not.toBe(source1);
        expect(getOperationSource(operationOut.insert![0])).not.toBe(source1);
        expect(getOperationSource(operationOut.where!)).toBe(source1);
      });
    });

    describe('getWholeServiceClauses', () => {
      const serviceSources = { source1, sourceService, sourceUnreachable };
      const context = new ActionContext();

      it('should be empty without SERVICE clauses', async() => {
        const operation = AF.createJoin([ pattern, pattern ]);
        await expect(actor.getWholeServiceClauses(operation, serviceSources, context)).resolves.toEqual(new Set());
      });

      it('should be empty for a SERVICE clause with a variable target', async() => {
        const operation = AF.createService(pattern, DF.variable('s'));
        await expect(actor.getWholeServiceClauses(operation, serviceSources, context)).resolves.toEqual(new Set());
      });

      it('should be empty for a SERVICE clause without a known source', async() => {
        const operation = AF.createService(pattern, DF.namedNode('sourceOther'));
        await expect(actor.getWholeServiceClauses(operation, serviceSources, context)).resolves.toEqual(new Set());
      });

      it('should be empty for a SERVICE clause of which the source is unreachable', async() => {
        const operation = AF.createService(pattern, DF.namedNode('sourceUnreachable'));
        await expect(actor.getWholeServiceClauses(operation, serviceSources, context)).resolves.toEqual(new Set());
      });

      it('should be empty for a SERVICE clause of which the source accepts the body', async() => {
        const operation = AF.createService(pattern, DF.namedNode('source1'));
        await expect(actor.getWholeServiceClauses(operation, serviceSources, context)).resolves.toEqual(new Set());
      });

      it('should contain all SERVICE clauses that are evaluated as a whole', async() => {
        const serviceOp1 = AF.createService(pattern, DF.namedNode('sourceService'));
        const serviceOp2 = AF.createService(AF.createBgp([ pattern ]), DF.namedNode('sourceService'));
        const operation = AF.createProject(AF.createJoin([
          serviceOp1,
          AF.createService(pattern, DF.namedNode('source1')),
          serviceOp2,
        ]), []);
        const wholeServiceClauses = await actor.getWholeServiceClauses(operation, serviceSources, context);
        expect(wholeServiceClauses.size).toBe(2);
        expect(wholeServiceClauses.has(serviceOp1)).toBe(true);
        expect(wholeServiceClauses.has(serviceOp2)).toBe(true);
      });

      it('should not request the shapes of sources that no SERVICE clause targets', async() => {
        const getSelectorShape = jest.fn(() => shapeService);
        const sourceOther: IQuerySourceWrapper = <any> { source: { getSelectorShape }};
        const serviceOp = AF.createService(pattern, DF.namedNode('sourceService'));
        await expect(actor.getWholeServiceClauses(serviceOp, { sourceService, sourceOther }, context))
          .resolves.toEqual(new Set([ serviceOp ]));
        expect(getSelectorShape).not.toHaveBeenCalled();
      });

      it('should not request the shapes of the sources of nested SERVICE clauses', async() => {
        const getSelectorShape = jest.fn(() => shapeService);
        const sourceNested: IQuerySourceWrapper = <any> { source: { getSelectorShape }};
        const operation = AF.createService(
          AF.createService(pattern, DF.namedNode('sourceNested')),
          DF.namedNode('source1'),
        );
        await expect(actor.getWholeServiceClauses(operation, { source1, sourceNested }, context))
          .resolves.toEqual(new Set());
        expect(getSelectorShape).not.toHaveBeenCalled();
      });

      it('should request shapes with the context of the source merged into the given context', async() => {
        const getSelectorShape = jest.fn(() => shapeService);
        const sourceWithContext: IQuerySourceWrapper = <any> {
          source: { getSelectorShape },
          context: new ActionContext({ a: 'b' }),
        };
        const serviceOp = AF.createService(pattern, DF.namedNode('sourceWithContext'));
        await expect(actor.getWholeServiceClauses(serviceOp, { sourceWithContext }, new ActionContext({ c: 'd' })))
          .resolves.toEqual(new Set([ serviceOp ]));
        expect(getSelectorShape).toHaveBeenCalledWith(new ActionContext({ a: 'b', c: 'd' }));
      });
    });
  });
});
