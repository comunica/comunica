import type { IMetadataValidationState } from '@comunica/types';
import { MetadataValidationState } from '../lib/MetadataValidationState';

describe('MetadataValidationState', () => {
  let state: IMetadataValidationState;

  beforeEach(() => {
    state = new MetadataValidationState();
  });

  describe('without invalidate listeners', () => {
    it('can be invalidated', () => {
      expect(state.valid).toBeTruthy();
      state.invalidate();
      expect(state.valid).toBeFalsy();
    });
  });

  describe('with invalidate listeners', () => {
    let listener1: any;
    let listener2: any;
    beforeEach(() => {
      listener1 = jest.fn();
      listener2 = jest.fn();
      state.addInvalidateListener(listener1);
      state.addInvalidateListener(listener2);
    });

    it('can be invalidated', () => {
      expect(state.valid).toBeTruthy();
      state.invalidate();
      expect(state.valid).toBeFalsy();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('can be invalidated only', () => {
      expect(state.valid).toBeTruthy();
      state.invalidate();
      expect(state.valid).toBeFalsy();
      state.invalidate();
      expect(state.valid).toBeFalsy();
      state.invalidate();
      expect(state.valid).toBeFalsy();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });
});
