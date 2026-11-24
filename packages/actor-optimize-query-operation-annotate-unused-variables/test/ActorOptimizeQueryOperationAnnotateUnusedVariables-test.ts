import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationAnnotateUnusedVariables } from '../lib';
import '@comunica/utils-jest';

const DF = new DataFactory();
const AF = new AlgebraFactory();
const v = (name: string): RDF.Variable => DF.variable(name);
const p = (name: string): RDF.NamedNode => DF.namedNode(`ex:${name}`);
function pattern(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph?: RDF.Term): Algebra.Pattern {
  return AF.createPattern(subject, predicate, object, graph);
}

describe('ActorOptimizeQueryOperationAnnotateUnusedVariables', () => {
  let bus: any;
  let actor: ActorOptimizeQueryOperationAnnotateUnusedVariables;
  let context: IActionContext;

  const run = async(operation: Algebra.Operation): Promise<any> => (await actor.run({ operation, context })).operation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    actor = new ActorOptimizeQueryOperationAnnotateUnusedVariables({ name: 'actor', bus });
    context = new ActionContext({});
  });

  it('should test', async() => {
    await expect(actor.test({ operation: <any> undefined, context })).resolves.toPassTestVoid();
  });

  it('should not change operations without patterns', async() => {
    const operation = AF.createValues([ v('s') ], [{ s: p('a') }]);
    const action = { operation, context };
    const result = await actor.run(action);
    expect(result.operation).toBe(operation);
    expect(result.context).toBe(context);
  });

  it('should not change operations without unused variables', async() => {
    const operation = AF.createProject(pattern(v('s'), p('p'), v('o')), [ v('s'), v('o') ]);
    await expect(run(operation)).resolves.toBe(operation);
  });

  it('should annotate variables that are not projected', async() => {
    const operation = await run(AF.createProject(pattern(v('s'), p('p'), v('o')), [ v('s') ]));
    expect(operation.input.metadata).toEqual({ unusedVariables: [ 'o' ]});
  });

  it('should annotate all unused variables of a pattern in the order subject, predicate, object', async() => {
    const operation = await run(AF.createAsk(pattern(v('o'), v('p'), v('s'))));
    expect(operation.input.metadata).toEqual({ unusedVariables: [ 'o', 'p', 's' ]});
  });

  it('should keep the existing metadata of patterns', async() => {
    const input = <Algebra.Pattern> { ...pattern(v('s'), p('p'), v('o')), metadata: { other: true }};
    const operation = await run(AF.createProject(input, [ v('s') ]));
    expect(operation.input.metadata).toEqual({ other: true, unusedVariables: [ 'o' ]});
  });

  it('should not annotate variables that occur in multiple patterns', async() => {
    const operation = await run(AF.createProject(AF.createJoin([
      pattern(v('s'), p('p'), v('o')),
      pattern(v('o'), p('q'), v('x')),
    ]), [ v('s') ]));
    expect(operation.input.input[0].metadata).toBeUndefined();
    expect(operation.input.input[1].metadata).toEqual({ unusedVariables: [ 'x' ]});
  });

  it('should not annotate variables that occur twice in the same pattern', async() => {
    const operation = AF.createAsk(pattern(v('s'), p('p'), v('s')));
    await expect(run(operation)).resolves.toBe(operation);
  });

  it('should not annotate graph variables', async() => {
    const operation = await run(AF.createProject(pattern(v('s'), p('p'), v('o'), v('g')), [ v('s') ]));
    expect(operation.input.metadata).toEqual({ unusedVariables: [ 'o' ]});
  });

  it('should not annotate variables in quoted triples', async() => {
    const quoted = DF.quad(v('a'), p('p'), v('b'));
    const operation = await run(AF.createProject(pattern(v('s'), p('p'), quoted), [ v('s') ]));
    expect(operation.input.metadata).toBeUndefined();
  });

  it.each([
    [ 'filters', (input: Algebra.Operation) =>
      AF.createFilter(input, AF.createOperatorExpression('bound', [ AF.createTermExpression(v('o')) ])) ],
    [ 'extensions', (input: Algebra.Operation) => AF.createExtend(input, v('x'), AF.createTermExpression(v('o'))) ],
    [ 'orderings', (input: Algebra.Operation) => AF.createOrderBy(input, [ AF.createTermExpression(v('o')) ]) ],
    [ 'groupings', (input: Algebra.Operation) => AF.createGroup(input, [ v('o') ], []) ],
    [ 'aggregates', (input: Algebra.Operation) => AF.createGroup(input, [], [ AF.createBoundAggregate(
      v('c'),
      'count',
      AF.createTermExpression(v('o')),
      false,
    ) ]) ],
    [ 'values', (input: Algebra.Operation) => AF.createJoin([ input, AF.createValues([ v('o') ], [{ o: p('a') }]) ]) ],
    [ 'paths', (input: Algebra.Operation) => AF.createJoin([
      input,
      AF.createPath(v('o'), AF.createLink(p('q')), v('s')),
    ]) ],
    [ 'optional expressions', (input: Algebra.Operation) => AF.createLeftJoin(
      input,
      pattern(v('s'), p('q'), v('s')),
      AF.createOperatorExpression('bound', [ AF.createTermExpression(v('o')) ]),
    ) ],
    [ 'construct templates', (input: Algebra.Operation) => AF.createConstruct(input, [
      pattern(v('s'), p('q'), v('o')),
    ]) ],
  ])('should not annotate variables used in %s', async(name, wrap) => {
    const operation = await run(AF.createProject(wrap(pattern(v('s'), p('p'), v('o'))), [ v('s') ]));
    expect(JSON.stringify(operation)).not.toContain('unusedVariables');
  });

  it('should annotate variables that only occur in a pattern of an existence expression', async() => {
    const exists = pattern(v('s'), p('q'), v('z'));
    const operation = await run(AF.createProject(AF.createFilter(
      pattern(v('s'), p('p'), v('s')),
      AF.createExistenceExpression(true, exists),
    ), [ v('s') ]));
    expect(operation.input.expression.input.metadata).toEqual({ unusedVariables: [ 'z' ]});
  });

  it('should not annotate any variable if a wildcard occurs', async() => {
    const operation = AF.createProject(AF.createGroup(pattern(v('s'), p('p'), v('o')), [], [
      AF.createBoundAggregate(v('c'), 'count', AF.createWildcardExpression(), true),
    ]), [ v('c') ]);
    await expect(run(operation)).resolves.toBe(operation);
  });

  it('should not annotate patterns of templates', async() => {
    const construct = await run(AF.createConstruct(pattern(v('s'), p('p'), v('o')), [
      pattern(v('s'), p('q'), v('x')),
    ]));
    expect(construct.input.metadata).toEqual({ unusedVariables: [ 'o' ]});
    expect(construct.template[0].metadata).toBeUndefined();
    const update = await run(AF.createDeleteInsert(
      [ pattern(v('s'), p('q'), v('x')) ],
      [ pattern(v('s'), p('r'), v('y')) ],
      pattern(v('s'), p('p'), v('o')),
    ));
    expect(update.where.metadata).toEqual({ unusedVariables: [ 'o' ]});
    expect(update.delete[0].metadata).toBeUndefined();
    expect(update.insert[0].metadata).toBeUndefined();
  });

  it('should not descend into metadata', async() => {
    const cyclic: any = { other: true };
    cyclic.self = cyclic;
    const input = <Algebra.Pattern> { ...pattern(v('s'), p('p'), v('o')), metadata: cyclic };
    const operation = await run(AF.createProject(input, [ v('s') ]));
    expect(operation.input.metadata.unusedVariables).toEqual([ 'o' ]);
  });
});
