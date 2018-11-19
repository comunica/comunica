import {ActorQueryOperation, Bindings, IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {ActionContext, Bus} from "@comunica/core";
import {literal} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import {ActorQueryOperationFilterTree, KEY_CONTEXT_TREE_FILTER} from "../lib/ActorQueryOperationFilterTree";
const arrayifyStream = require('arrayify-stream');

describe('ActorQueryOperationFilterTree', () => {
  let bus;
  let mediatorQueryOperation;
  const truthyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'true' },
    type: 'expression',
  };
  const falsyExpression = {
    expressionType: 'term',
    term: { termType: 'Literal', value: 'false' },
    type: 'expression',
  };
  const unknownExpression = {
    args: [],
    expressionType: 'term',
    operator: 'DUMMY',
    type: 'operator',
  };

  const hypermediaSource = { type: 'hypermedia', value: 'hypermedia-tree', flags: { isTree: true }};

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorQueryOperation = {
      mediate: (arg) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          Bindings({ a: literal('1') }),
          Bindings({ a: literal('2') }),
          Bindings({ a: literal('3') }),
        ]),
        metadata: () => Promise.resolve({ totalItems: 3 }),
        operated: arg,
        type: 'bindings',
        variables: ['a'],
      }),
    };
  });

  describe('The ActorQueryOperationFilterTree module', () => {
    it('should be a function', () => {
      expect(ActorQueryOperationFilterTree).toBeInstanceOf(Function);
    });

    it('should be a ActorQueryOperationFilterTree constructor', () => {
      expect(new (<any> ActorQueryOperationFilterTree)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperationFilterTree);
      expect(new (<any> ActorQueryOperationFilterTree)({ name: 'actor', bus, mediatorQueryOperation }))
        .toBeInstanceOf(ActorQueryOperation);
    });

    it('should not be able to create new ActorQueryOperationFilterTree objects without \'new\'', () => {
      expect(() => { (<any> ActorQueryOperationFilterTree)(); }).toThrow();
    });
  });

  describe('An ActorQueryOperationFilterTree instance', () => {
    let actor: ActorQueryOperationFilterTree;

    beforeEach(() => {
      actor = new ActorQueryOperationFilterTree({ name: 'actor', bus, mediatorQueryOperation });
    });

    it('should test on filter', () => {
      const contextWithSource: ActionContext = ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': hypermediaSource},
      );
      const op = { operation: { type: 'filter', expression: truthyExpression }, context: contextWithSource };
      return expect(actor.test(op)).resolves.toBeTruthy();
    });

    it('should test not test when already filter in context', () => {
      const contextWithSource: ActionContext = ActionContext(
        {
          '@comunica/actor-query-operation-filter-tree:filter': truthyExpression,
          '@comunica/bus-rdf-resolve-quad-pattern:source': hypermediaSource,
        },
      );
      const op = { operation: { type: 'filter', expression: truthyExpression }, context: contextWithSource };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-filter', () => {
      const contextWithSource: ActionContext = ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': hypermediaSource},
      );
      const op = { operation: { type: 'some-other-type' }, context: contextWithSource };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-context', () => {
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression } };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-hypermedia-tree type', () => {
      const contextWithSource: ActionContext = ActionContext(
        { '@comunica/bus-rdf-resolve-quad-pattern:source': { type: 'some-other-type', value: 'some-other-type'}},
      );
      const op = { operation: { type: 'filter', input: {}, expression: falsyExpression }, context: contextWithSource };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should not test on non-source', () => {
      const contextWithoutSource: ActionContext = ActionContext({});
      const op = {
        context: contextWithoutSource,
        operation: { type: 'filter', input: {}, expression: falsyExpression },
      };
      return expect(actor.test(op)).rejects.toBeTruthy();
    });

    it('should add filter to the context', async () => {
      const contextEmpty: ActionContext = ActionContext({});
      const op = { operation: { type: 'filter', input: {}, expression: truthyExpression}, context: contextEmpty };
      let hasContextFilter: boolean;

      // Mock the mediator's mediate function so we can check if the filter was added to the context
      actor.mediatorQueryOperation.mediate = async (action): Promise<IActorQueryOperationOutputBindings> => {
        hasContextFilter = expect(action.context.get(KEY_CONTEXT_TREE_FILTER)).toBeTruthy();
        return { type: 'bindings', bindingsStream: null, metadata: null, variables: null };
      };

      const output: IActorQueryOperationOutputBindings = <any> await actor.run(op);
      return hasContextFilter;
    });

  });
});
