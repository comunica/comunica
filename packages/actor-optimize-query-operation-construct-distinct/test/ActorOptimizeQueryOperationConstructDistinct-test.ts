import { KeysInitQuery } from '@comunica/context-entries/lib/Keys';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { ActorOptimizeQueryOperationConstructDistinct } from '../lib/ActorOptimizeQueryOperationConstructDistinct';

const DF = new DataFactory();
const factory = new Factory();

describe('ActorOptimizeQueryOperationConstructDistinct', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationConstructDistinct instance', () => {
    let actor: ActorOptimizeQueryOperationConstructDistinct;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationConstructDistinct({ name: 'actor', bus });
      context = new ActionContext().set(KeysInitQuery.distinct, true);
    });

    it('should throw when distinct key is not present', async() => {
      context = context.delete(KeysInitQuery.distinct);
      await expect(actor.test({ operation: <any> undefined, context })).resolves.toBeTruthy();
    });

    it('should test when distinct key is present', async() => {
      await expect(actor.test({ operation: <any> undefined, context })).resolves.toBe(true);
    });

    it('should run', async() => {
      await expect(actor.run({ operation:
        factory.createConstruct(
          factory.createBgp(
            [ factory.createPattern(
              DF.namedNode('s'),
              DF.variable('vp'),
              DF.variable('vo'),
            ) ],
          ),
          [ factory.createPattern(
            DF.namedNode('s'),
            DF.variable('vp'),
            DF.variable('vo'),
          ) ],
        ), context })).resolves.toMatchObject(
        {
          context,
          operation:
                  factory.createDistinct(
                    factory.createConstruct(
                      factory.createBgp(
                        [ factory.createPattern(
                          DF.namedNode('s'),
                          DF.variable('vp'),
                          DF.variable('vo'),
                        ) ],
                      ),
                      [ factory.createPattern(
                        DF.namedNode('s'),
                        DF.variable('vp'),
                        DF.variable('vo'),
                      ) ],
                    ),
                  ),
        },
      );
    });
  });
});
