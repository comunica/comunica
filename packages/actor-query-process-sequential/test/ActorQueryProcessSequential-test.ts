import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { MediatorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorQueryParse } from '@comunica/bus-query-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import { ActorQueryProcessSequential } from '../lib/ActorQueryProcessSequential';

const DF = new DataFactory();
const AF = new Factory();
const BF = new BindingsFactory();

describe('ActorQueryProcessSequential', () => {
  let bus: any;
  let mediatorContextPreprocess: MediatorContextPreprocess;
  let mediatorQueryParse: MediatorQueryParse;
  let mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  let mediatorQueryOperation: MediatorQueryOperation;
  let mediatorMergeBindingsContext: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorContextPreprocess = <any> {
      mediate: jest.fn((action: any) => Promise.resolve(action)),
    };
    mediatorQueryParse = <any> {
      mediate: jest.fn((action: any) => Promise.resolve({
        operation: 'PARSED',
        context: action.context,
      })),
    };
    mediatorOptimizeQueryOperation = <any> {
      mediate: jest.fn((action: any) => Promise.resolve({
        operation: AF.createJoin([
          action.operation,
        ], false),
        context: action.context,
      })),
    };
    mediatorQueryOperation = <any> {
      mediate: jest.fn((action: any) => Promise.resolve({
        type: 'bindings',
        ...action,
      })),
    };
    mediatorMergeBindingsContext = {
      mediate(arg: any) {
        return {};
      },
    };
  });

  describe('An ActorQueryProcessSequential instance', () => {
    let actor: ActorQueryProcessSequential;
    let ctx: IActionContext;

    beforeEach(() => {
      ctx = new ActionContext();
      actor = new ActorQueryProcessSequential({
        name: 'actor',
        bus,
        mediatorContextPreprocess,
        mediatorQueryParse,
        mediatorOptimizeQueryOperation,
        mediatorQueryOperation,
        mediatorMergeBindingsContext,
      });
    });

    describe('test', () => {
      it('rejects on explain in context', async() => {
        await expect(actor.test({ query: 'q', context: new ActionContext().set(KeysInitQuery.explain, 'parsed') }))
          .rejects.toThrow(`actor is not able to explain queries.`);
      });

      it('handles no explain in context', async() => {
        expect(await actor.test({ query: 'q', context: new ActionContext() }))
          .toBeTruthy();
      });
    });

    describe('run', () => {
      it('parses, optimizes, and evaluates a query', async() => {
        const op: Algebra.Operation = AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
        );
        const { result } = await actor.run({
          query: op,
          context: ctx,
        });
        expect((<any> result).context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' })
          .set(KeysInitQuery.query, AF.createJoin([
            op,
          ], false)));
        expect((<any> result).operation).toEqual(AF.createJoin([
          op,
        ], false));

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
        });
        expect(mediatorQueryParse.mediate).not.toHaveBeenCalled();
        expect(mediatorOptimizeQueryOperation.mediate).toHaveBeenCalledWith({
          operation: op,
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
        });
        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          operation: AF.createJoin([
            op,
          ], false),
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' })
            .set(KeysInitQuery.query, AF.createJoin([
              op,
            ], false)),
        });
      });
    });

    describe('parse', () => {
      it('parses a query', async() => {
        const output = await actor.parse('query', ctx);
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryString, 'query')
          .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }));
        expect(output.operation).toEqual('PARSED');

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
        });
        expect(mediatorQueryParse.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryString, 'query')
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
          query: 'query',
          queryFormat: { language: 'sparql', version: '1.1' },
          baseIRI: undefined,
        });
      });

      it('parses a query with query format', async() => {
        const output = await actor.parse('query', ctx
          .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.1' }));
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryString, 'query')
          .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.1' })
          .set(KeysInitQuery.graphqlSingularizeVariables, {}));
        expect(output.operation).toEqual('PARSED');

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.1' })
            .set(KeysInitQuery.graphqlSingularizeVariables, {}),
        });
        expect(mediatorQueryParse.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryString, 'query')
            .set(KeysInitQuery.queryFormat, { language: 'graphql', version: '1.1' })
            .set(KeysInitQuery.graphqlSingularizeVariables, {}),
          query: 'query',
          queryFormat: { language: 'graphql', version: '1.1' },
          baseIRI: undefined,
        });
      });

      it('parses a query with baseIRI in query', async() => {
        (<any> mediatorQueryParse).mediate = jest.fn((action: any) => Promise.resolve({
          operation: 'PARSED',
          context: action.context,
          baseIRI: 'BASE',
        }));

        const output = await actor.parse('query', ctx);
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryString, 'query')
          .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' })
          .set(KeysInitQuery.baseIRI, 'BASE'));
        expect(output.operation).toEqual('PARSED');

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
        });
        expect(mediatorQueryParse.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryString, 'query')
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
          query: 'query',
          queryFormat: { language: 'sparql', version: '1.1' },
          baseIRI: undefined,
        });
      });

      it('parses a query as algebra', async() => {
        const op: Algebra.Operation = AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
        );
        const output = await actor.parse(op, ctx);
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }));
        expect(output.operation).toEqual(op);

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' }),
        });
        expect(mediatorQueryParse.mediate).not.toHaveBeenCalled();
      });

      it('parses handles initial bindings', async() => {
        const op: Algebra.Operation = AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.variable('vo'),
        );
        const output = await actor.parse(op, ctx
          .set(KeysInitQuery.initialBindings, BF.fromRecord({ vo: DF.namedNode('o') })));
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' })
          .set(KeysInitQuery.initialBindings, BF.fromRecord({ vo: DF.namedNode('o') })));
        expect(output.operation).toEqual(AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
        ));

        expect(mediatorContextPreprocess.mediate).toHaveBeenCalledWith({
          context: new ActionContext()
            .set(KeysInitQuery.queryFormat, { language: 'sparql', version: '1.1' })
            .set(KeysInitQuery.initialBindings, BF.fromRecord({ vo: DF.namedNode('o') })),
        });
        expect(mediatorQueryParse.mediate).not.toHaveBeenCalled();
      });
    });

    describe('optimize', () => {
      it('optimizes a query', async() => {
        const op: Algebra.Operation = AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
        );

        const output = await actor.optimize(op, ctx);
        expect(output.context).toEqual(new ActionContext()
          .set(KeysInitQuery.query, AF.createJoin([
            op,
          ], false)));
        expect(output.operation).toEqual(AF.createJoin([
          op,
        ], false));

        expect(mediatorOptimizeQueryOperation.mediate).toHaveBeenCalledWith({
          operation: op,
          context: new ActionContext(),
        });
      });
    });

    describe('evaluate', () => {
      it('evaluates a query', async() => {
        const op: Algebra.Operation = AF.createPattern(
          DF.namedNode('s'),
          DF.namedNode('p'),
          DF.namedNode('o'),
        );

        const output = await actor.evaluate(op, ctx);
        expect(output).toEqual({
          type: 'bindings',
          operation: op,
          context: ctx,
        });

        expect(mediatorQueryOperation.mediate).toHaveBeenCalledWith({
          operation: op,
          context: new ActionContext(),
        });
      });
    });
  });
});
