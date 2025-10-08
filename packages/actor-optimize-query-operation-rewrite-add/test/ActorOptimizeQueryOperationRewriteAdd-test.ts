import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationRewriteAdd } from '../lib/ActorOptimizeQueryOperationRewriteAdd';
import '@comunica/utils-jest';

const DF = new DataFactory<RDF.BaseQuad>();
const AF = new AlgebraFactory();

describe('ActorOptimizeQueryOperationRewriteAdd', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorOptimizeQueryOperationRewriteAdd instance', () => {
    let actor: ActorOptimizeQueryOperationRewriteAdd;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationRewriteAdd({ name: 'actor', bus });
    });

    it('should always test', async() => {
      await expect(actor.test({ operation: <any> null, context })).resolves.toPassTestVoid();
    });

    it('should run with named source and named destination', async() => {
      const op = {
        operation: AF.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createDeleteInsert(undefined, [
        AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
      ], AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))));
    });

    it('should run with default source and named destination', async() => {
      const op = {
        operation: AF.createAdd('DEFAULT', DF.namedNode('DEST'), false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createDeleteInsert(undefined, [
        AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('DEST')),
      ], AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())));
    });

    it('should run with named source and default destination', async() => {
      const op = {
        operation: AF.createAdd(DF.namedNode('SOURCE'), 'DEFAULT', false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createDeleteInsert(undefined, [
        AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
      ], AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.namedNode('SOURCE'))));
    });

    it('should run with default source and default destination', async() => {
      const op = {
        operation: AF.createAdd('DEFAULT', 'DEFAULT', false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createDeleteInsert(undefined, [
        AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph()),
      ], AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), DF.defaultGraph())));
    });
  });
});
