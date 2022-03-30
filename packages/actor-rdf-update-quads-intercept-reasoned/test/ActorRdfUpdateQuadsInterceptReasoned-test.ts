import type {
  IActionRdfReason, IActorRdfReasonOutput, MediatorRdfReason,
} from '@comunica/bus-rdf-reason';
import type { IActionRdfUpdateQuadsIntercept } from '@comunica/bus-rdf-update-quads-intercept';
import { KeysRdfResolveQuadPattern, KeysRdfUpdateQuads } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import { mediatorRdfResolveQuadPattern, mediatorRdfUpdateQuads } from '@comunica/reasoning-mocks';
import type { IReasonGroup } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { fromArray } from 'asynciterator';
import { promisifyEventEmitter } from 'event-emitter-promisify';
import { Store, DataFactory } from 'n3';
import { ActorRdfUpdateQuadsInterceptReasoned } from '../lib';

const { namedNode, quad, defaultGraph } = DataFactory;
describe('ActorRdfUpdateQuadsInterceptReasoned', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfUpdateQuadsInterceptReasoned instance', () => {
    let actor: ActorRdfUpdateQuadsInterceptReasoned;
    let action: IActionRdfUpdateQuadsIntercept;
    let source: Store;
    let destination: Store;
    let implicitDestination: Store;
    let reasonGroup: IReasonGroup;
    let context: IActionContext;
    let execute: () => Promise<void>;
    let quads: RDF.Quad[];

    let insertedDataset: Store;
    let deletedDataset: Store;

    beforeEach(() => {
      source = new Store();
      destination = new Store();
      implicitDestination = new Store();
      reasonGroup = {
        dataset: implicitDestination,
        status: { type: 'full', reasoned: false },
        context: new ActionContext(),
      };
      context = new ActionContext({
        [KeysRdfResolveQuadPattern.sources.name]: [ source, destination ],
        [KeysRdfUpdateQuads.destination.name]: destination,
        [KeysRdfReason.data.name]: reasonGroup,
      });

      actor = new ActorRdfUpdateQuadsInterceptReasoned({
        name: 'actor',
        bus,
        mediatorRdfReason: <MediatorRdfReason> <any> {
          async mediate(_action: IActionRdfReason): Promise<IActorRdfReasonOutput> {
            return {
              async execute() {
                insertedDataset = new Store();
                deletedDataset = new Store();

                if (_action?.updates?.quadStreamInsert)
                { await promisifyEventEmitter(insertedDataset.import(_action.updates.quadStreamInsert)); }
                if (_action?.updates?.quadStreamDelete)
                { await promisifyEventEmitter(deletedDataset.import(_action.updates.quadStreamDelete)); }
              },
            };
          },
        },
        mediatorRdfResolveQuadPattern,
        mediatorRdfUpdateQuads,
      });
    });

    it('should test true if source and destination are provided', () => {
      return expect(actor.test({ context })).resolves.toEqual(true);
    });

    it('should reject if a destination is not provided provided', () => {
      return expect(actor.test({
        context: new ActionContext({
          [KeysRdfResolveQuadPattern.source.name]: source,
        }),
      })).rejects.toThrowError();
    });

    it('should run', async() => {
      execute = (await actor.run({ context })).execute;
      await execute();
      expect(destination.getQuads(null, null, null, null)).toEqual([]);
    });

    describe('Performing inserts', () => {
      beforeEach(async() => {
        action = {
          context,
          quadStreamInsert: fromArray([
            quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
          ]),
        };

        execute = (await actor.run(action)).execute;
      });

      it('Should not have inserted the quad into the store prior to calling execute', () => {
        expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
      });

      describe('Post running execute', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should have inserted the quad into the store', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([
            quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
          ]);
        });
      });
    });

    describe('Performing deletes', () => {
      beforeEach(async() => {
        quads = [
          quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
          quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g')),
          quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g1')),
          quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g1')),
          quad(namedNode('s'), namedNode('p'), namedNode('o'), defaultGraph()),
          quad(namedNode('s1'), namedNode('p'), namedNode('o'), defaultGraph()),
        ];

        destination.addQuads(quads);
      });

      describe('Deleting a single quad', () => {
        beforeEach(async() => {
          action = {
            context,
            quadStreamDelete: fromArray([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
            ]),
          };

          execute = (await actor.run(action)).execute;
        });

        it('Should not have deleted the quads prior to calling execute', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic(quads);
        });

        describe('Post running execute', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have the correct delta streams', () => {
            expect(insertedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
            expect(deletedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
            ]);
          });

          it('Should have deleted the quad from the store', () => {
            expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s'), namedNode('p'), namedNode('o'), defaultGraph()),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), defaultGraph()),
            ]);
          });
        });
      });

      describe('Deleting a graph', () => {
        beforeEach(async() => {
          action = {
            context,
            deleteGraphs: {
              graphs: [ namedNode('g') ],
              requireExistence: true,
              dropGraphs: true,
            },
          };

          execute = (await actor.run(action)).execute;
        });

        it('Should not have deleted the quads prior to calling execute', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic(quads);
        });

        describe('Post running execute', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have the correct delta streams', () => {
            expect(insertedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
            expect(deletedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g')),
            ]);
          });

          it('Should have deleted all quads from the graph quad from the store', () => {
            expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s'), namedNode('p'), namedNode('o'), defaultGraph()),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), defaultGraph()),
            ]);
          });
        });
      });

      describe('Deleting named graph', () => {
        beforeEach(async() => {
          action = {
            context,
            deleteGraphs: {
              graphs: 'NAMED',
              requireExistence: true,
              dropGraphs: true,
            },
          };

          execute = (await actor.run(action)).execute;
        });

        it('Should not have deleted the quads prior to calling execute', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic(quads);
        });

        describe('Post running execute', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have the correct delta streams', () => {
            expect(insertedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
            expect(deletedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g1')),
            ]);
          });

          it('Should have deleted all named quads', () => {
            expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), defaultGraph()),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), defaultGraph()),
            ]);
          });
        });
      });

      describe('Deleting all graphs', () => {
        beforeEach(async() => {
          action = {
            context,
            deleteGraphs: {
              graphs: 'ALL',
              requireExistence: true,
              dropGraphs: true,
            },
          };

          execute = (await actor.run(action)).execute;
        });

        it('Should not have deleted the quads prior to calling execute', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic(quads);
        });

        describe('Post running execute', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have deleted all named quads', () => {
            expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
          });
        });
      });

      describe('Deleting default graph', () => {
        beforeEach(async() => {
          action = {
            context,
            deleteGraphs: {
              graphs: defaultGraph(),
              requireExistence: true,
              dropGraphs: true,
            },
          };

          execute = (await actor.run(action)).execute;
        });

        it('Should not have deleted the quads prior to calling execute', () => {
          expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic(quads);
        });

        describe('Post running execute', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have the correct delta streams', () => {
            expect(insertedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([]);
            expect(deletedDataset.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), defaultGraph()),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), defaultGraph()),
            ]);
          });

          it('Should have deleted all default graph quads', () => {
            expect(destination.getQuads(null, null, null, null)).toBeRdfIsomorphic([
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g')),
              quad(namedNode('s'), namedNode('p'), namedNode('o'), namedNode('g1')),
              quad(namedNode('s1'), namedNode('p'), namedNode('o'), namedNode('g1')),
            ]);
          });
        });
      });
    });
  });
});
