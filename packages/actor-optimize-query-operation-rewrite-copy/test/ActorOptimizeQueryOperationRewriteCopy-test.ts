import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationRewriteCopy } from '../lib/ActorOptimizeQueryOperationRewriteCopy';
import '@comunica/utils-jest';

const DF = new DataFactory<RDF.BaseQuad>();
const AF = new AlgebraFactory(DF);

describe('ActorOptimizeQueryOperationRewriteCopy', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('An ActorOptimizeQueryOperationRewriteCopy instance', () => {
    let actor: ActorOptimizeQueryOperationRewriteCopy;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationRewriteCopy({ name: 'actor', bus });
    });

    it('should always test', async() => {
      await expect(actor.test({ operation: <any> null, context })).resolves.toPassTestVoid();
    });

    it('should run with different named source and named dest', async() => {
      const op = {
        operation: AF.createCopy(DF.namedNode('SOURCE'), DF.namedNode('DEST'), false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([
        AF.createDrop(DF.namedNode('DEST'), true),
        AF.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), false),
      ]));
    });

    it('should run with different named source and named dest in silent mode', async() => {
      const op = {
        operation: AF.createCopy(DF.namedNode('SOURCE'), DF.namedNode('DEST'), true),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([
        AF.createDrop(DF.namedNode('DEST'), true),
        AF.createAdd(DF.namedNode('SOURCE'), DF.namedNode('DEST'), true),
      ]));
    });

    it('should run with equal named source and named dest', async() => {
      const op = {
        operation: AF.createCopy(DF.namedNode('SOURCE'), DF.namedNode('SOURCE'), false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([]));
    });

    it('should run with equal default source and default dest', async() => {
      const op = {
        operation: AF.createCopy('DEFAULT', 'DEFAULT', false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([]));
    });

    it('should run with different default source and named dest', async() => {
      const op = {
        operation: AF.createCopy('DEFAULT', DF.namedNode('DEST'), false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([
        AF.createDrop(DF.namedNode('DEST'), true),
        AF.createAdd('DEFAULT', DF.namedNode('DEST'), false),
      ]));
    });

    it('should run with different named source and default dest', async() => {
      const op = {
        operation: AF.createCopy(DF.namedNode('SOURCE'), 'DEFAULT', false),
        context: new ActionContext({ [KeysInitQuery.dataFactory.name]: DF }),
      };
      const { operation } = await actor.run(op);
      expect(operation).toEqual(AF.createCompositeUpdate([
        AF.createDrop('DEFAULT', true),
        AF.createAdd(DF.namedNode('SOURCE'), 'DEFAULT', false),
      ]));
    });
  });
});
