import {blankNode, defaultGraph, literal, namedNode, variable} from "@rdfjs/data-model";
import {Map} from "immutable";
import {Bindings, ensureBindings, isBindings, materializeOperation, materializeTerm} from "..";
import {Factory} from "sparqlalgebrajs";

describe('Bindings', () => {
  it('should create a map', () => {
    expect(Bindings({ a: namedNode('b') })).toBeInstanceOf(Map);
  });
});

describe('isBindings', () => {
  it('should be true for bindings', () => {
    expect(isBindings(Bindings({}))).toBeTruthy();
  });

  it('should be false for other objects', () => {
    expect(isBindings({})).toBeFalsy();
  });
});

describe('ensureBindings', () => {
  it('should not change things that are already bindings', () => {
    const b = Bindings({});
    expect(ensureBindings(b)).toBe(b);
  });

  it('should create bindings from hashes', () => {
    expect(ensureBindings({})).toBeInstanceOf(Map);
    expect(ensureBindings({ a: namedNode('b') }).get('a')).toEqual(namedNode('b'));
  });
});

const factory = new Factory();

const termNamedNode = namedNode('a');
const termLiteral = literal('b');
const termVariableA = variable('a');
const termVariableB = variable('b');
const termVariableC = blankNode('c');
const termVariableD = variable('d');
const termDefaultGraph = defaultGraph();

const valueA = literal('A');
const valueC = literal('C');

const bindingsEmpty = Bindings({});
const bindingsA = Bindings({'?a': literal('A')});
const bindingsC = Bindings({'_:c': literal('C')});
const bindingsAC = Bindings({'?a': valueA, '_:c': valueC});

describe('materializeTerm', () => {
  it('should not materialize a named node with empty bindings', () => {
    return expect(materializeTerm(termNamedNode, bindingsEmpty))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for a', () => {
    return expect(materializeTerm(termNamedNode, bindingsA))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for c', () => {
    return expect(materializeTerm(termNamedNode, bindingsC))
      .toEqual(termNamedNode);
  });

  it('should not materialize a named node with bindings for a and c', () => {
    return expect(materializeTerm(termNamedNode, bindingsAC))
      .toEqual(termNamedNode);
  });

  it('should not materialize a literal with empty bindings', () => {
    return expect(materializeTerm(termLiteral, bindingsEmpty))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for a', () => {
    return expect(materializeTerm(termLiteral, bindingsA))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for c', () => {
    return expect(materializeTerm(termLiteral, bindingsC))
      .toEqual(termLiteral);
  });

  it('should not materialize a literal with bindings for a and c', () => {
    return expect(materializeTerm(termLiteral, bindingsAC))
      .toEqual(termLiteral);
  });

  it('should not materialize a variable with empty bindings', () => {
    return expect(materializeTerm(termVariableC, bindingsEmpty))
      .toEqual(termVariableC);
  });

  it('should not materialize a variable with bindings for a', () => {
    return expect(materializeTerm(termVariableC, bindingsA))
      .toEqual(termVariableC);
  });

  it('should not materialize a blank node with bindings for c', () => {
    return expect(materializeTerm(termVariableC, bindingsC))
      .toEqual(termVariableC);
  });

  it('should not materialize a blank node with bindings for a and c', () => {
    return expect(materializeTerm(termVariableC, bindingsAC))
      .toEqual(termVariableC);
  });

  it('should not materialize a default graph with empty bindings', () => {
    return expect(materializeTerm(termDefaultGraph, bindingsEmpty))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for a', () => {
    return expect(materializeTerm(termDefaultGraph, bindingsA))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for c', () => {
    return expect(materializeTerm(termDefaultGraph, bindingsC))
      .toEqual(termDefaultGraph);
  });

  it('should not materialize a default graph with bindings for a and c', () => {
    return expect(materializeTerm(termDefaultGraph, bindingsAC))
      .toEqual(termDefaultGraph);
  });
});

describe('materializeOperation', () => {
  it('should materialize a quad pattern with empty bindings', () => {
    return expect(materializeOperation(
      factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
      bindingsEmpty))
      .toEqual(factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should materialize a quad pattern with non-empty bindings', () => {
    return expect(materializeOperation(
      factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
      bindingsA))
      .toEqual(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should materialize a BGP with non-empty bindings', () => {
    return expect(materializeOperation(
      factory.createBgp([
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
      ]),
      bindingsA))
      .toEqual(factory.createBgp([
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
      ]));
  });

  it('should materialize a path expression with non-empty bindings', () => {
    return expect(materializeOperation(
      factory.createPath(termVariableA, null, termVariableC, termNamedNode),
      bindingsA))
      .toEqual(factory.createPath(valueA, null, termVariableC, termNamedNode));
  });

  it('should materialize a nested path expression with non-empty bindings', () => {
    return expect(materializeOperation(
      factory.createPath(
        termVariableA,
        factory.createAlt(
          factory.createNps([namedNode('A')]),
          factory.createNps([namedNode('B')]),
        ),
        termVariableC,
        termNamedNode,
      ),
      bindingsA))
      .toEqual(factory.createPath(
        valueA,
        factory.createAlt(
          factory.createNps([namedNode('A')]),
          factory.createNps([namedNode('B')]),
        ),
        termVariableC,
        termNamedNode,
      ));
  });

  it('should not modify an extend operation without matching variables', () => {
    return expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableB)
      ),
      bindingsA))
      .toEqual(factory.createExtend(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableB)
      ));
  });

  it('should modify an extend operation with matching variables', () => {
    return expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(termVariableA)
      ),
      bindingsA))
      .toEqual(factory.createExtend(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        termVariableB,
        factory.createTermExpression(valueA)
      ));
  });

  it('should error on an extend operation with a binding variable equal to the target variable for strictTargetVariables', () => {
    return expect(() => materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableA,
        factory.createTermExpression(termVariableA)
      ),
      bindingsA, true)).toThrow(new Error('Tried to bind variable ?a in a BIND operator.'));
  });

  it('should modify an extend operation with binding variable equal to the target variable', () => {
    return expect(materializeOperation(
      factory.createExtend(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        termVariableA,
        factory.createTermExpression(termVariableC)
      ),
      bindingsA))
      .toEqual(factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode));
  });

  it('should not modify a group operation without matching variables', () => {
    return expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableB),
          true,
        )]
      ),
      bindingsA))
      .toEqual(factory.createGroup(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableB),
          true,
        )]
      ));
  });

  it('should modify a group operation with matching variables', () => {
    return expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        )]
      ),
      bindingsA))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        )]
      ));
  });

  it('should error on a group operation with a binding variable equal to the target variable for strictTargetVariables', () => {
    return expect(() => materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableA, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        )]
      ),
      bindingsA, true)).toThrow(new Error('Tried to bind variable ?a in a GROUP BY operator.'));
  });

  it('should modify a group operation with a binding variable equal to the target variable', () => {
    return expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableA, termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        )]
      ),
      bindingsA))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableD],
        [factory.createBoundAggregate(
          termVariableB,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        )]
      ));
  });

  it('should error on a group operation with a binding variable equal to the bound aggregate variable for strictTargetVariables', () => {
    return expect(() => materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        )]
      ),
      bindingsA, true)).toThrow(new Error('Tried to bind ?a in a SUM aggregate.'));
  });

  it('should modify a group operation with aa binding variable equal to the bound aggregate variable', () => {
    return expect(materializeOperation(
      factory.createGroup(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(termVariableA),
          true,
        )]
      ),
      bindingsA))
      .toEqual(factory.createGroup(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
        [factory.createBoundAggregate(
          termVariableA,
          'SUM',
          factory.createTermExpression(valueA),
          true,
        )]
      ));
  });

  it('should not modify a project operation without matching variables', () => {
    return expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ),
      bindingsA))
      .toEqual(factory.createProject(
        factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ));
  });

  it('should modify a project operation with matching variables', () => {
    return expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ),
      bindingsA))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ));
  });

  it('should modify a project operation with matching variables for strictTargetVariables', () => {
    return expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ),
      bindingsA, true))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableB, termVariableD],
      ));
  });

  it('should error on a project operation with a binding variable equal to the target variable for strictTargetVariables', () => {
    return expect(() => materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableA, termVariableD],
      ),
      bindingsA, true)).toThrow(new Error('Tried to bind variable ?a in a SELECT operator.'));
  });

  it('should modify a project operation with a binding variable equal to the target variable', () => {
    return expect(materializeOperation(
      factory.createProject(
        factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
        [termVariableA, termVariableD],
      ),
      bindingsA))
      .toEqual(factory.createProject(
        factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
        [termVariableD],
      ));
  });

  it('should not modify a values operation without matching variables', () => {
    return expect(materializeOperation(
      factory.createValues(
        [termVariableB, termVariableD],
        [{ '?b': valueC }],
      ),
      bindingsA))
      .toEqual(factory.createValues(
        [termVariableB, termVariableD],
        [{ '?b': valueC }],
      ));
  });

  it('should not modify a values operation without matching variables for strictTargetVariables', () => {
    return expect(materializeOperation(
      factory.createValues(
        [termVariableB, termVariableD],
        [{ '?b': valueC }],
      ),
      bindingsA, true))
      .toEqual(factory.createValues(
        [termVariableB, termVariableD],
        [{ '?b': valueC }],
      ));
  });

  it('should error on a values operation with a binding variable equal to the target variable for strictTargetVariables', () => {
    return expect(() => materializeOperation(
      factory.createValues(
        [termVariableA, termVariableD],
        [{ '?a': valueC, '?d': valueC }],
      ),
      bindingsA, true)).toThrow(new Error('Tried to bind variable ?a in a VALUES operator.'));
  });

  it('should modify a values operation with a binding variable equal to the target variable', () => {
    return expect(materializeOperation(
      factory.createValues(
        [termVariableA, termVariableD],
        [{ '?a': valueC, '?d': valueC }],
      ),
      bindingsA))
      .toEqual(factory.createValues(
        [termVariableD],
        [{ '?d': valueC }],
      ));
  });

  it('should not modify a filter expression without matching variables', () => {
    return expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableB),
          factory.createTermExpression(termVariableB)
        ])
      ),
      bindingsA))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableB, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableB),
          factory.createTermExpression(termVariableB)
        ])
      ));
  });

  it('should modify a filter expression with matching variables', () => {
    return expect(materializeOperation(
      factory.createFilter(
        factory.createBgp([
          factory.createPattern(termVariableA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(termVariableA),
          factory.createTermExpression(termVariableB)
        ])
      ),
      bindingsA))
      .toEqual(factory.createFilter(
        factory.createBgp([
          factory.createPattern(valueA, termNamedNode, termVariableC, termNamedNode),
          factory.createPattern(termNamedNode, termVariableB, termVariableC, termNamedNode),
        ]),
        factory.createOperatorExpression('contains', [
          factory.createTermExpression(valueA),
          factory.createTermExpression(termVariableB)
        ])
      ));
  });
});
