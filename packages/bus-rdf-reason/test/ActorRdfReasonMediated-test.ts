import { KeysRdfResolveQuadPattern, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { Actor, IActorTest } from '@comunica/core';
import { ActionContext, Bus } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import {
  mediatorOptimizeRule, mediatorRdfResolveQuadPattern, mediatorRdfUpdateQuads, mediatorRuleResolve,
} from '@comunica/reasoning-mocks';
import type { IPartialReasonedStatus, IReasonGroup, IReasonStatus } from '@comunica/reasoning-types';
import { fromArray } from 'asynciterator';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import
import { DataFactory, Store } from 'n3';
import { Factory } from 'sparqlalgebrajs';
import { ActorRdfReasonMediated } from '../lib';
import type {
  IActionRdfReason, IActorRdfReasonOutput,
} from '../lib/ActorRdfReason';
import { implicitGroupFactory, setReasoningStatus } from '../lib/ActorRdfReason';
import type { IActionRdfReasonExecute, IActorRdfReasonMediatedArgs } from '../lib/ActorRdfReasonMediated';

const { namedNode, quad, variable } = DataFactory;

const factory = new Factory();

class MyClass extends ActorRdfReasonMediated {
  public constructor(args: IActorRdfReasonMediatedArgs) {
    super(args);
  }

  public async test(action: IActionRdfReason): Promise<IActorTest> {
    return true;
  }

  public async execute(action: IActionRdfReasonExecute): Promise<void> {
    return Promise.resolve();
  }
}

// TODO: Test resolution of promises

describe('ActorRdfReasonMediated', () => {
  let bus: Bus<
  Actor<IActionRdfReason, IActorTest, IActorRdfReasonOutput>, IActionRdfReason, IActorTest, IActorRdfReasonOutput>;
  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfReasonMediated instance', () => {
    let actor: ActorRdfReasonMediated;
    let action: IActionRdfReason;
    let data: IReasonGroup;
    let destination: Store;
    let source: Store;
    let execute: () => Promise<void>;

    beforeEach(() => {
      actor = new MyClass({
        name: 'actor',
        bus,
        mediatorOptimizeRule,
        mediatorRdfResolveQuadPattern,
        mediatorRdfUpdateQuads,
        mediatorRuleResolve,
      });

      data = implicitGroupFactory(
        new ActionContext({
          [KeysRdfReason.implicitDatasetFactory.name]: () => new Store(),
        }),
      );

      destination = new Store();

      source = new Store();

      action = {
        context: new ActionContext({
          [KeysRdfReason.data.name]: data,
          [KeysRdfReason.rules.name]: 'my-unnested-rules',
          [KeysRdfUpdateQuads.destination.name]: destination,
          [KeysRdfResolveQuadPattern.source.name]: source,
        }),
      };
    });

    it('Should always test true - since that what we have declared our mock class should do', () => {
      return expect(actor.test(action)).resolves.toEqual(true);
    });

    describe('The actor has been run but not executed', () => {
      beforeEach(async() => {
        execute = (await actor.run(action)).execute;
      });

      it('Should not be reasoned if execute is not called', async() => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
      });

      describe('The actor has been run and executed', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should be reasoned after execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>(({ type: 'full', reasoned: true, done: Promise.resolve() }));
        });
      });
    });

    describe('The actor has been run but not executed [on a fully reasoned source]', () => {
      let reasoningStatus: any;
      beforeEach(async() => {
        reasoningStatus = { type: 'full', reasoned: true, done: Promise.resolve() };
        setReasoningStatus(action.context, reasoningStatus);
        execute = (await actor.run(action)).execute;
      });

      it('Should not be reasoned if execute is not called', async() => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: true, done: Promise.resolve() });
      });

      describe('The actor has been run and executed', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should be reasoned after execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>(reasoningStatus);
          expect(data.status).toEqual<IReasonStatus>(reasoningStatus);
          expect(data.status === reasoningStatus).toBe(true);
        });
      });
    });

    describe('The actor has been run but not executed [on a fully reasoned source, with action pattern]', () => {
      let reasoningStatus: any;
      beforeEach(async() => {
        reasoningStatus = { type: 'full', reasoned: true, done: Promise.resolve() };
        setReasoningStatus(action.context, reasoningStatus);
        execute = (await actor.run({
          ...action,
          pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), variable('?o')),
        })).execute;
      });

      it('Should not be reasoned if execute is not called', async() => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: true, done: Promise.resolve() });
      });

      describe('The actor has been run and executed', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should be reasoned after execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>(reasoningStatus);
          expect(data.status).toEqual<IReasonStatus>(reasoningStatus);
          expect(data.status === reasoningStatus).toBe(true);
        });
      });
    });

    describe('The actor has been run but not executed [on a source with fully reasoned false]', () => {
      let reasoningStatus: any;
      beforeEach(async() => {
        reasoningStatus = { type: 'full', reasoned: false };
        setReasoningStatus(action.context, reasoningStatus);
        execute = (await actor.run(action)).execute;
      });

      it('Should not be reasoned if execute is not called', async() => {
        expect(data.status).toMatchObject<IReasonStatus>(reasoningStatus);
      });

      describe('The actor has been run and executed', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should be reasoned after execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: true, done: Promise.resolve() });
        });
      });
    });

    describe('The actor has been run but not executed [on a source with fully reasoned false, with action pattern]',
      () => {
        let reasoningStatus: any;
        beforeEach(async() => {
          reasoningStatus = { type: 'full', reasoned: false };
          setReasoningStatus(action.context, reasoningStatus);
          execute = (await actor.run({
            ...action,
            pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), variable('?o')),
          })).execute;
        });

        it('Should not be reasoned if execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>(reasoningStatus);
        });

        describe('The actor has been run and executed', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have partial reasoning applied', () => {
            const { status } = data;
            expect(status.type).toEqual('partial');
            const { patterns } = <IPartialReasonedStatus> status;
            expect(patterns.size).toEqual(1);
            const [[ term, state ]] = patterns.entries();

            expect(term.equals(quad(variable('s'), namedNode('http://example.org#type'), variable('?o')))).toBe(true);
            expect(state).toMatchObject({ type: 'full', reasoned: true, done: Promise.resolve() });
          });
        });
      });

    describe('Testing the actor on a pattern', () => {
      beforeEach(() => {
        action = {
          ...action,
          pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), variable('?o')),
        };
      });

      it('Should be able to test the actor on a patterned action', () => {
        return expect(actor.test(action)).resolves.toEqual(true);
      });

      it('Should be full not reasoned before the run action is called', () => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
      });

      describe('.run is called but execute is not yet run', () => {
        beforeEach(async() => {
          execute = (await actor.run(action)).execute;
        });

        it('Should be full not reasoned before the run action is called', () => {
          expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
        });

        describe('execute is called', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have partial reasoning applied', () => {
            const { status } = data;
            expect(status.type).toEqual('partial');
            const { patterns } = <IPartialReasonedStatus> status;
            expect(patterns.size).toEqual(1);
            const [[ term, state ]] = patterns.entries();

            expect(term.equals(quad(variable('s'), namedNode('http://example.org#type'), variable('?o')))).toBe(true);
            expect(state).toMatchObject({ type: 'full', reasoned: true, done: Promise.resolve() });
          });
        });
      });
    });

    describe('Testing the actor on overlapping patterns ?s type thing and s type ?o', () => {
      let actionRestricted: any;
      let executeRestricted: () => Promise<void>;
      beforeEach(async() => {
        actionRestricted = {
          ...action,
          pattern: factory.createPattern(
            variable('s'), namedNode('http://example.org#type'), namedNode('http://example.org#thing'),
          ),
        };

        action = {
          ...action,
          pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), variable('?o')),
        };

        executeRestricted = (await actor.run(actionRestricted)).execute;
        execute = (await actor.run(action)).execute;
      });

      it('Should be full not reasoned before the run action is called', () => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
      });

      describe('executeRestricted is called', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should have partial reasoning applied', () => {
          const { status } = data;
          expect(status.type).toEqual('partial');
          const { patterns } = <IPartialReasonedStatus> status;
          expect(patterns.size).toEqual(1);
          const [[ term, state ]] = patterns.entries();

          expect(term.equals(quad(variable('s'), namedNode('http://example.org#type'), variable('?o')))).toBe(true);
          expect(state).toMatchObject({ type: 'full', reasoned: true, done: Promise.resolve() });
        });

        describe('execute is called', () => {
          beforeEach(async() => {
            await executeRestricted();
          });

          it('Should not have applied any further reasoning', () => {
            const { status } = data;
            expect(status.type).toEqual('partial');
            const { patterns } = <IPartialReasonedStatus> status;
            expect(patterns.size).toEqual(1);
            const [[ term, state ]] = patterns.entries();

            expect(term.equals(quad(variable('s'), namedNode('http://example.org#type'), variable('?o')))).toBe(true);
            expect(state).toMatchObject({ type: 'full', reasoned: true, done: Promise.resolve() });
          });
        });
      });
    });

    describe('Testing the actor on overlapping patterns ?s type ?s and ?s type ?o', () => {
      let actionRestricted: any;
      let executeRestricted: () => Promise<void>;
      beforeEach(async() => {
        actionRestricted = {
          ...action,
          pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), namedNode('s')),
        };

        action = {
          ...action,
          pattern: factory.createPattern(variable('s'), namedNode('http://example.org#type'), variable('?o')),
        };

        executeRestricted = (await actor.run(actionRestricted)).execute;
        execute = (await actor.run(action)).execute;
      });

      it('Should be full not reasoned before the run action is called', () => {
        expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
      });

      describe('executeRestricted is called', () => {
        beforeEach(async() => {
          await executeRestricted();
        });

        describe('execute is called', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should have applied further reasoning', () => {
            const { status } = data;
            expect(status.type).toEqual('partial');
            const { patterns } = <IPartialReasonedStatus> status;
            expect(patterns.size).toEqual(2);
          });
        });
      });
    });

    describe('Testing the actor on an update query action and unreasoned', () => {
      beforeEach(() => {
        action = {
          ...action,
          updates: {
            quadStreamInsert: fromArray([
              quad(
                namedNode('http://example.org#s'),
                namedNode('http://example.org#p'),
                namedNode('http://example.org#o'),
              ),
            ]),
          },
        };
      });

      describe('The actor has been run but not executed (with no reasoning yet applied)', () => {
        beforeEach(async() => {
          execute = (await actor.run(action)).execute;
        });

        it('Should not be reasoned if execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>({ type: 'full', reasoned: false });
        });

        describe('The actor has been run and executed', () => {
          beforeEach(async() => {
            await execute();
          });

          it('Should be reasoned after execute is not called', async() => {
            expect(data.status).toMatchObject<IReasonStatus>(({
              type: 'full',
              reasoned: true,
              done: Promise.resolve(),
            }));
          });
        });
      });
    });

    describe('The actor has been run but not executed (starting in a partial reasoned status)', () => {
      beforeEach(async() => {
        setReasoningStatus(action.context, { type: 'partial', patterns: new Map() });
        execute = (await actor.run(action)).execute;
      });

      it('Should not be reasoned if execute is not called', async() => {
        expect(data.status).toMatchObject({ type: 'partial', patterns: new Map() });
      });

      describe('The actor has been run and executed', () => {
        beforeEach(async() => {
          await execute();
        });

        it('Should be reasoned after execute is not called', async() => {
          expect(data.status).toMatchObject<IReasonStatus>(({ type: 'full', reasoned: true, done: Promise.resolve() }));
        });
      });
    });
  });
});
