import { ActionContext, Bus } from '@comunica/core';
import { ActorMergeBindingFactoryContextUnion } from '../lib/ActorMergeBindingFactoryContextUnion';
import { IActionContext } from '@comunica/types';
import { SetUnionContext } from '../lib/SetUnionContext';

describe('ActorMergeBindingFactoryContextUnion', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorMergeBindingFactoryContextUnion instance', () => {
    let setUnionMergeHandler: SetUnionContext;
    let actor: ActorMergeBindingFactoryContextUnion;
    let context: IActionContext;

    beforeEach(() => {
      setUnionMergeHandler = new SetUnionContext()
      actor = new ActorMergeBindingFactoryContextUnion({ name: 'actor', bus, contextKey: 'sources'});
      context = new ActionContext();
    });

    it('should test', () => {
      return expect(actor.test({ context: context })).resolves.toEqual(true); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ context: context })).resolves.toMatchObject( 
        {"mergeHandlers": {"sources": new SetUnionContext()}}); // TODO
    });
    it('should be SetUnionConstructor', ()=>{
      expect(new (<any> SetUnionContext)())
      .toBeInstanceOf(SetUnionContext);
    })
    it('merge handler should return set union', () => {
      const inputSets = [['1', '2', '3'],['1', '3', '5'], ['2', '1']];
      return expect(setUnionMergeHandler.run(...inputSets)).toStrictEqual(['1','2','3','5'])
    })
  });
});
