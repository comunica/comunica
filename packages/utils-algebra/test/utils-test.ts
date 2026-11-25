import { DataFactory } from 'rdf-data-factory';
import type { Operation } from '../lib/Algebra';
import { Types } from '../lib/Algebra';
import { AlgebraFactory } from '../lib/AlgebraFactory';
import type { AlgebraTransformer } from '../lib/utils';
import {
  algebraTransformer,
  getSubOperations,
  hasOperationType,
  inScopeVariables,
  transformer,
  visitOperationMembers,
} from '../lib/utils';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

describe('algebraTransformer', () => {
  /**
   * A distinct over a project, with an operation hidden in the metadata of the distinct.
   * Whether the keys of the distinct and the project are traversed is decided by their node pre-visitors.
   */
  function createOperation(): any {
    return Object.assign(
      AF.createDistinct(AF.createProject(AF.createNop(), [ DF.variable('v') ])),
      { metadata: { nested: AF.createNop() }},
    );
  }

  /**
   * An operation of a type Comunica does not know, with an operation as input and one hidden in its metadata.
   * Without a node pre-visitor, whether that metadata is traversed is decided by the object context.
   */
  function createUnknownOperation(): any {
    return { type: 'unknown', input: AF.createNop(), metadata: { nested: AF.createNop() }};
  }

  /**
   * The number of NOP operations the given transformer reaches while transforming the given operation.
   */
  function countNops(transformerInstance: AlgebraTransformer<'unsafe', any>, operation: any): number {
    let nops = 0;
    transformerInstance.transformNode(operation, {
      [Types.NOP]: { transform: (nop) => {
        nops++;
        return nop;
      } },
    });
    return nops;
  }

  it('should return the shared transformer when it is not configured.', () => {
    expect(algebraTransformer()).toBe(transformer);
  });

  it('should apply the default object context and node pre-visitors.', () => {
    const operation = createOperation();
    const copy = <any> algebraTransformer().transformNode(operation, {});
    // The metadata is shallowly copied, but the operation inside of it is not traversed
    expect(copy.metadata).not.toBe(operation.metadata);
    expect(copy.metadata.nested).toBe(operation.metadata.nested);
    expect(countNops(algebraTransformer(), operation)).toBe(1);
    // The variables of a project are not traversed
    expect(copy.input.variables).toBe(operation.input.variables);
  });

  it('should apply the default object context when only node pre-visitors are given.', () => {
    const operation = createOperation();
    const custom = algebraTransformer(undefined, { [Types.DISTINCT]: { copy: false }});
    // The operation inside the metadata is still left alone, and the requested pre-visitor is applied
    expect(countNops(custom, operation)).toBe(1);
    expect(custom.transformNode(operation, {})).toBe(operation);
  });

  it('should drop the default object context when it is not requested.', () => {
    const operation = createUnknownOperation();
    expect(countNops(algebraTransformer(), operation)).toBe(1);
    const custom = algebraTransformer({ useDefaults: false });
    // Without the default object context, the operation inside the metadata is traversed as well
    expect(countNops(custom, operation)).toBe(2);
  });

  it('should only traverse the known keys of the operation types Comunica knows.', () => {
    const operation = Object.assign(AF.createDistinct(AF.createNop()), { extension: AF.createNop() });
    // The operation under the unknown key of the distinct is not traversed
    expect(countNops(algebraTransformer(), operation)).toBe(1);
    const copy = <any> algebraTransformer().transformNode(operation, {});
    expect(copy.input).not.toBe(operation.input);
    expect(copy.extension).toBe(operation.extension);
  });

  it('should traverse every key but the metadata of operation types Comunica does not know.', () => {
    const operation = { ...createUnknownOperation(), extension: AF.createNop() };
    expect(countNops(algebraTransformer(), operation)).toBe(2);
  });

  it.each([
    AF.createNodes(DF.namedNode('ex:g'), DF.variable('v')),
    AF.createDistinctTerms([ DF.variable('v') ], { v: 'subject' }, { graph: DF.namedNode('ex:g') }),
  ])('should not traverse the terms of the operation type $type defined by Comunica.', (operation: any) => {
    const copy = <any> algebraTransformer().transformNode(operation, {});
    expect(copy).not.toBe(operation);
    for (const key of Object.keys(operation)) {
      expect(copy[key]).toBe(operation[key]);
    }
  });

  it('should drop the default node pre-visitors when they are not requested.', () => {
    const operation = createOperation();
    const custom = algebraTransformer(undefined, { useDefaults: false });
    // Without the default node pre-visitor of the project, its variables are traversed
    const copy = <any> custom.transformNode(operation, {});
    expect(copy.input.variables).not.toBe(operation.input.variables);
  });
});

describe('visitOperationMembers', () => {
  /**
   * The members of the given operation, in the order they are visited.
   */
  function getMembers(operation: Operation, membersTransformer?: typeof transformer): Operation[] {
    const members: Operation[] = [];
    visitOperationMembers(operation, member => members.push(member), membersTransformer);
    return members;
  }

  it('visits the operations held by the operation itself', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const expression = AF.createTermExpression(DF.literal('true'));
    const members = getMembers(AF.createFilter(pattern, expression));

    // The order of the keys is up to the transformer
    expect(members).toHaveLength(2);
    expect(members).toEqual(expect.arrayContaining([ pattern, expression ]));
  });

  it('visits the elements of an array rather than the array, in their order', () => {
    const pattern1 = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.variable('o'));
    const pattern2 = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o'));

    expect(getMembers(AF.createBgp([ pattern1, pattern2, pattern1 ]))).toEqual([ pattern1, pattern2, pattern1 ]);
  });

  it('skips the keys that a traversal skips', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const operation: any = AF.createProject(pattern, [ DF.variable('s') ]);
    operation.metadata = { hidden: AF.createNop() };

    // The variables of a project and the metadata of any operation are never traversed
    expect(getMembers(operation)).toEqual([ pattern ]);
  });

  it('visits the operations the given transformer steps into', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const filter = AF.createFilter(pattern, AF.createTermExpression(DF.literal('true')));
    const membersTransformer = transformer.clone({}, {
      [Types.FILTER]: { ignoreKeys: new Set([ 'expression', 'metadata' ]) },
    });

    expect(getMembers(filter, membersTransformer)).toEqual([ pattern ]);
  });

  it('skips the keys Comunica does not know of an operation type it knows', () => {
    const input = AF.createNop();
    const operation = Object.assign(AF.createDistinct(input), { extension: AF.createNop() });

    expect(getMembers(operation)).toEqual([ input ]);
  });

  it('visits the operations of every key but the metadata of an operation type Comunica does not know', () => {
    const input = AF.createNop();
    const wrapped = AF.createNop();
    const members = getMembers(<Operation> {
      type: 'unknown',
      input,
      name: 'unknown',
      term: DF.variable('v'),
      wrapper: { wrapped },
      metadata: { hidden: AF.createNop() },
    });

    // Operations within other objects are visited too, as the transformer steps into these objects
    expect(members).toHaveLength(2);
    expect(members).toEqual(expect.arrayContaining([ input, wrapped ]));
  });
});

describe('getSubOperations', () => {
  it('returns the nested operations', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const operation = AF.createProject(AF.createJoin([ pattern, pattern ]), []);

    expect(getSubOperations(operation)).toEqual([ operation.input ]);
    expect(getSubOperations(operation.input)).toEqual([ pattern, pattern ]);
    expect(getSubOperations(pattern)).toEqual([]);
  });

  it('does not return expressions or the path of a path operation', () => {
    const path = AF.createPath(
      DF.variable('s'),
      AF.createOneOrMorePath(AF.createLink(DF.namedNode('ex:p'))),
      DF.variable('o'),
    );
    const filter = AF.createFilter(path, AF.createTermExpression(DF.literal('true')));

    expect(getSubOperations(filter)).toEqual([ path ]);
    expect(getSubOperations(path)).toEqual([]);
  });

  it('does not return the template of a construct', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const template = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.variable('o'));
    const construct = AF.createConstruct(pattern, [ template ]);

    expect(getSubOperations(construct)).toEqual([ pattern ]);
  });

  it('does not return the templates of a delete-insert', () => {
    const where = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const toDelete = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p1'), DF.variable('o'));
    const toInsert = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p2'), DF.variable('o'));
    const deleteInsert = AF.createDeleteInsert([ toDelete ], [ toInsert ], where);

    expect(getSubOperations(deleteInsert)).toEqual([ where ]);
  });

  it('does not return the metadata of an operation', () => {
    const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
    const operation: any = AF.createProject(pattern, []);
    operation.metadata = { hidden: AF.createNop() };

    expect(getSubOperations(operation)).toEqual([ pattern ]);
  });
});

describe('inScopeVariables', () => {
  const pattern = AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'));
  const template = AF.createPattern(DF.variable('s'), DF.namedNode('ex:p'), DF.variable('template'));

  /**
   * Copy the given operation with a pattern hidden in its metadata.
   * The pattern stands in for a source annotation, whose cycles would make a traversal hang.
   * @param operation An operation.
   * @return The copy with the hidden pattern.
   */
  function hidePatternInMetadata<O extends Operation>(operation: O): O {
    const hidden = AF.createPattern(DF.variable('hidden'), DF.namedNode('ex:p'), DF.namedNode('ex:o'));
    return { ...operation, metadata: { hidden }};
  }

  it('does not traverse the metadata of a group', () => {
    const count = AF.createBoundAggregate(
      DF.variable('count'),
      'count',
      AF.createTermExpression(DF.variable('o')),
      false,
    );
    const group = hidePatternInMetadata(AF.createGroup(pattern, [ DF.variable('s') ], [ count ]));

    // The aggregates of the group are still traversed
    expect(inScopeVariables(group)).toEqual([ DF.variable('count'), DF.variable('s') ]);
  });

  it('does not traverse the metadata of a construct', () => {
    const construct = hidePatternInMetadata(AF.createConstruct(pattern, [ template ]));

    // The template of the construct is still not traversed
    expect(inScopeVariables(construct)).toEqual([ DF.variable('s'), DF.variable('p'), DF.variable('o') ]);
  });

  it('does not traverse the metadata of a delete-insert', () => {
    const deleteInsert = hidePatternInMetadata(AF.createDeleteInsert([ template ], [ template ], pattern));

    // The templates of the delete-insert are still not traversed
    expect(inScopeVariables(deleteInsert)).toEqual([ DF.variable('s'), DF.variable('p'), DF.variable('o') ]);
  });
});

describe('hasOperationType', () => {
  const pattern = AF.createPattern(DF.variable('s'), DF.namedNode('p'), DF.variable('o'));

  it('should find the type of the operation itself', () => {
    expect(hasOperationType(pattern, [ Types.PATTERN ])).toBe(true);
  });

  it('should find the types of nested operations', () => {
    const operation = AF.createProject(AF.createJoin([ pattern, AF.createFilter(
      pattern,
      AF.createTermExpression(DF.variable('s')),
    ) ]), [ DF.variable('s') ]);
    expect(hasOperationType(operation, [ Types.FILTER ])).toBe(true);
    expect(hasOperationType(operation, [ Types.UNION, Types.JOIN ])).toBe(true);
    expect(hasOperationType(operation, [ Types.UNION ])).toBe(false);
  });

  it('should find operations within expressions', () => {
    const union = AF.createUnion([ pattern, pattern ]);
    const operation = AF.createFilter(pattern, AF.createExistenceExpression(false, union));
    expect(hasOperationType(operation, [ Types.UNION ])).toBe(true);
    expect(hasOperationType(operation, [ Types.EXPRESSION ])).toBe(true);
  });

  it('should not look into metadata', () => {
    const operation: Operation = AF.createJoin([ pattern ]);
    operation.metadata = { union: AF.createUnion([ pattern ]) };
    expect(hasOperationType(operation, [ Types.UNION ])).toBe(false);
  });

  it('should not look into terms', () => {
    const operation = AF.createPattern(
      <any> { ...DF.quad(DF.variable('s'), DF.namedNode('p'), DF.variable('o')), type: Types.UNION },
      DF.namedNode('p'),
      DF.variable('o'),
    );
    expect(hasOperationType(operation, [ Types.UNION ])).toBe(false);
  });
});
