import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { materializeOperation, materializeTerm } from '..';

const DF = new DataFactory();
const BF = new BindingsFactory();

const factory = new Factory();

const termNamedNode = DF.namedNode('a');
const termLiteral = DF.literal('b');
const termVariableA = DF.variable('a');
const termVariableB = DF.variable('b');
const termVariableC = DF.blankNode('c');
const termVariableD = DF.variable('d');
const termDefaultGraph = DF.defaultGraph();

const valueA = DF.literal('A');
const valueB = DF.literal('B');
const valueC = DF.literal('C');

const bindingsEmpty = BF.bindings();
const bindingsA = BF.bindings([
  [ DF.variable('a'), DF.literal('A') ],
]);
const bindingsC = BF.bindings([
  [ DF.variable('c'), DF.literal('C') ],
]);
const bindingsAC = BF.bindings([
  [ DF.variable('a'), valueA ],
  [ DF.variable('c'), valueC ],
]);
const bindingsAB = BF.bindings([
  [ DF.variable('a'), valueA ],
  [ DF.variable('b'), valueB ],
]);

describe('materializeTerm', () => {
  it('should not materialize a named node with empty bindings', () => {
    expect(materializeTerm(termNamedNode, bindingsEmpty))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for a', () => {
    expect(materializeTerm(termNamedNode, bindingsA))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for c', () => {
    expect(materializeTerm(termNamedNode, bindingsC))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for a and c', () => {
    expect(materializeTerm(termNamedNode, bindingsAC))
      .toEqual(termNamedNode);
  });

  it('should not materialize a literal with empty bindings', () => {
    expect(materializeTerm(termLiteral, bindingsEmpty))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for a', () => {
    expect(materializeTerm(termLiteral, bindingsA))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for c', () => {
    expect(materializeTerm(termLiteral, bindingsC))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for a and c', () => {
    expect(materializeTerm(termLiteral, bindingsAC))
      .toEqual(termLiteral);
  });

  it('should not materialize a variable with empty bindings', () => {
    expect(materializeTerm(termVariableC, bindingsEmpty))
      .toEqual(termVariableC);
  });

  it('should not materialize a variable with bindings for a', () => {
    expect(materializeTerm(termVariableC, bindingsA))
      .toEqual(termVariableC);
  });

  it('should not materialize a blank node with bindings for c', () => {
    expect(materializeTerm(termVariableC, bindingsC))
      .toEqual(termVariableC);
  });

  it('should not materialize a blank node with bindings for a and c', () => {
    expect(materializeTerm(termVariableC, bindingsAC))
      .toEqual(termVariableC);
  });

  it('should not materialize a default graph with empty bindings', () => {
    expect(materializeTerm(termDefaultGraph, bindingsEmpty))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for a', () => {
    expect(materializeTerm(termDefaultGraph, bindingsA))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for c', () => {
    expect(materializeTerm(termDefaultGraph, bindingsC))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for a and c', () => {
    expect(materializeTerm(termDefaultGraph, bindingsAC))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a quoted triple without variables', () => {
    expect(materializeTerm(DF.quad(
      termNamedNode,
      termNamedNode,
      termNamedNode,
    ), bindingsAC))
      .toEqual(DF.quad(
        termNamedNode,
        termNamedNode,
        termNamedNode,
      ));
  });

  it('should materialize a quoted triple with variables', () => {
    expect(materializeTerm(DF.quad(
      termVariableA,
      termNamedNode,
      termVariableB,
    ), bindingsAB))
      .toEqual(DF.quad(
        <any> valueA,
        termNamedNode,
        valueB,
      ));
  });

  it('should materialize a nested quoted triple with variables', () => {
    expect(materializeTerm(DF.quad(
      termVariableA,
      termNamedNode,
      DF.quad(
        termVariableA,
        termNamedNode,
        termVariableB,
      ),
    ), bindingsAB))
      .toEqual(DF.quad(
        <any> valueA,
        termNamedNode,
        DF.quad(
          <any> valueA,
          termNamedNode,
          valueB,
        ),
      ));
  });
});

describe('materializeOperation', () => {
  it('should materialize a quad pattern with empty bindings', () => {
    expect(materializeOperation(
      factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
      bindingsEmpty,
      BF,
    ))
      .toEqual(factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should materialize a quad pattern with non-empty bindings', () => {
    expect(materializeOperation(
      factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should materialize a quad pattern with non-empty bindings and keep metadata', () => {
    const metadata = { a: 'b' };
    expect(materializeOperation(
      Object.assign(factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode), { metadata }),
      bindingsA,
      BF,
    ))
      .toEqual(Object.assign(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode), { metadata }));
  });

  it('should materialize a BGP with non-empty bindings', () => {
    expect(materializeOperation(
      factory.createBgp([
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
      ]),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createBgp([
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
      ]));
  });

  it('should materialize a path expression with non-empty bindings', () => {
    expect(materializeOperation(
      factory.createPath(termVariableA, <any> null, termVariableC, termNamedNode),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createPath(valueA, <any> null, termVariableC, termNamedNode));
  });

  it('should materialize a path expression with non-empty bindings and keep metadata', () => {
    const metadata = { a: 'b' };
    expect(materializeOperation(
      Object.assign(factory.createPath(termVariableA, <any> null, termVariableC, termNamedNode), { metadata }),
      bindingsA,
      BF,
    ))
      .toEqual(Object.assign(factory.createPath(valueA, <any> null, termVariableC, termNamedNode), { metadata }));
  });

  it('should materialize a nested path expression with non-empty bindings', () => {
    expect(materializeOperation(
      factory.createPath(
        termVariableA,
        factory.createAlt([
          factory.createNps([ DF.namedNode('A') ]),
          factory.createNps([ DF.namedNode('B') ]),
        ]),
        termVariableC,
        termNamedNode,
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createPath(
        valueA,
        factory.createAlt([
          factory.createNps([ DF.namedNode('A') ]),
          factory.createNps([ DF.namedNode('B') ]),
        ]),
        termVariableC,
        termNamedNode,
      ));
  });

  it('should not modify an extend operation without matching variables', () => {
    expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableB),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createExtend(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableB),
      ));
  });

  it('should modify an extend operation with matching variables', () => {
    expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableA),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createExtend(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(valueA),
      ));
  });

  it('should error on an extend operation with ' +
    'a binding variable equal to the target variable for strictTargetVariables', () => {
    expect(() => materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableA,
        factory.createTermExpression(termVariableA),
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    )).toThrow(new Error('Tried to bind variable ?a in a BIND operator.'));
  });

  it('should modify an extend operation with binding variable equal to the target variable', () => {
    expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableA,
        factory.createTermExpression(termVariableC),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should not modify a group operation without matching variables', () => {
    expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableB),
          true,
        ) ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createGroup(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableB),
          true,
        ) ],
      ));
  });

  it('should modify a group operation with matching variables', () => {
    expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        ) ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        ) ],
      ));
  });

  it('should error on a group operation with ' +
    'a binding variable equal to the target variable for strictTargetVariables', () => {
    expect(() => materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableA, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        ) ],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    )).toThrow(new Error('Tried to bind variable ?a in a GROUP BY operator.'));
  });

  it('should modify a group operation with a binding variable equal to the target variable', () => {
    expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableA, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        ) ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableD ],
        [ factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        ) ],
      ));
  });

  it('should error on a group operation with ' +
    'a binding variable equal to the bound aggregate variable for strictTargetVariables', () => {
    expect(() => materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        ) ],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    )).toThrow(new Error('Tried to bind ?a in a SUM aggregate.'));
  });

  it('should modify a group operation with aa binding variable equal to the bound aggregate variable', () => {
    expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        ) ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
        [ factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        ) ],
      ));
  });

  it('should not modify a project operation without matching variables', () => {
    expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createProject(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
      ));
  });

  it('should modify a project operation with matching variables', () => {
    expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableA, termVariableB, termVariableD ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
      ));
  });

  it('should modify a project operation with matching variables for strictTargetVariables', () => {
    expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    ))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableB, termVariableD ],
      ));
  });

  it('should error on a project operation with ' +
    'a binding variable equal to the target variable for strictTargetVariables', () => {
    expect(() => materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableA, termVariableD ],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    )).toThrow(new Error('Tried to bind variable ?a in a SELECT operator.'));
  });

  it('should modify a project operation with a binding variable equal to the target variable', () => {
    expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableA, termVariableD ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [ termVariableD ],
      ));
  });

  it('should only modify variables in the project operation that are present in the projection range', () => {
    expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableB, termNamedNode),
        [ termVariableD, termVariableB ],
      ),
      bindingsAB,
      BF,
    ))
      .toEqual(factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, valueB, termNamedNode),
        [ termVariableD ],
      ));
  });

  it('should not modify a values operation without matching variables', () => {
    expect(materializeOperation(
      factory.createValues(
        [ termVariableB, termVariableD ],
        [{ '?b': valueC }],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createValues(
        [ termVariableB, termVariableD ],
        [{ '?b': valueC }],
      ));
  });

  it('should not modify a values operation without matching variables for strictTargetVariables', () => {
    expect(materializeOperation(
      factory.createValues(
        [ termVariableB, termVariableD ],
        [{ '?b': valueC }],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    ))
      .toEqual(factory.createValues(
        [ termVariableB, termVariableD ],
        [{ '?b': valueC }],
      ));
  });

  it('should error on a values operation with ' +
    'a binding variable equal to the target variable for strictTargetVariables', () => {
    expect(() => materializeOperation(
      factory.createValues(
        [ termVariableA, termVariableD ],
        [{ '?a': valueC, '?d': valueC }],
      ),
      bindingsA,
      BF,
      { strictTargetVariables: true },
    )).toThrow(new Error('Tried to bind variable ?a in a VALUES operator.'));
  });

  it('should modify a values operation with a binding variable equal to the target variable', () => {
    expect(materializeOperation(
      factory.createValues(
        [ termVariableA, termVariableD ],
        [{ '?a': valueA, '?d': valueC }],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createValues(
        [ termVariableD ],
        [{ '?d': valueC }],
      ));
  });

  it('should modify a values operation with a binding variable equal to the target variable, ' +
    'and a non-matching binding value', () => {
    expect(materializeOperation(
      factory.createValues(
        [ termVariableA, termVariableD ],
        [
          { '?a': valueA, '?d': valueC },
          { '?a': valueC, '?d': valueC },
        ],
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createValues(
        [ termVariableD ],
        [{ '?d': valueC }],
      ));
  });

  it('should not modify a filter expression without matching variables', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableB),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableB),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });

  it('should modify a filter expression with matching variables', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableA),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(valueA),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });

  it('should modify a filter expression with BOUND with matching variables', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createOperatorExpression('bound', [ factory.createTermExpression(termVariableA) ]),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });

  it('should modify a not filter expression with invalid BOUND argument count', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createOperatorExpression('bound', [
            factory.createTermExpression(termVariableA),
            factory.createTermExpression(termVariableA),
          ]),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createOperatorExpression('bound', [
            factory.createTermExpression(valueA),
            factory.createTermExpression(valueA),
          ]),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });

  it('should modify a not filter expression with invalid BOUND argument type', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createOperatorExpression('bound', [
            factory.createOperatorExpression('a', [
              factory.createTermExpression(termVariableA),
            ]),
          ]),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createOperatorExpression('bound', [
            factory.createOperatorExpression('a', [
              factory.createTermExpression(valueA),
            ]),
          ]),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });

  it('should not modify a filter expression with matching variables with bindFilter: false', () => {
    expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableA),
          factory.createTermExpression(termVariableB),
        ]),
      ),
      bindingsA,
      BF,
      { bindFilter: false },
    ))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableA),
          factory.createTermExpression(termVariableB),
        ]),
      ));
  });
});
