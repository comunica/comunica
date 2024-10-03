import type { ILink } from '@comunica/types';
import { StatisticBase } from '../lib';

class MockStatisticBase<T> extends StatisticBase<T> {
  public updateStatistic(): void {}
}

describe('StatisticLinkDiscovery', () => {
  let mockStatisticBase: MockStatisticBase<ILink>;
  let cb: (data: ILink) => void;
  let cb1: (data: ILink) => void;

  beforeEach(() => {
    mockStatisticBase = new MockStatisticBase();
    cb = jest.fn(() => {});
    cb1 = jest.fn(() => {});
  });

  describe('An StatisticLinkDereference instance should', () => {
    it('attach an event listener', () => {
      mockStatisticBase.on(cb);
      expect(mockStatisticBase.getListeners()).toEqual(
        [ cb ],
      );
    });
    it('attach same function multiple times', () => {
      mockStatisticBase.on(cb);
      mockStatisticBase.on(cb);
      expect(mockStatisticBase.getListeners()).toEqual(
        [ cb, cb ],
      );
    });

    it('detach an event listener', () => {
      mockStatisticBase.on(cb);
      mockStatisticBase.removeListener(cb);
      expect(mockStatisticBase.getListeners()).toEqual(
        [ ],
      );
    });

    it ('detach multiple of the same listeners', () => {
      mockStatisticBase.on(cb);
      mockStatisticBase.on(cb);
      mockStatisticBase.removeListener(cb);
      expect(mockStatisticBase.getListeners()).toEqual(
        [ ],
      );
    });

    it('do nothing when detaching without listeners', () => {
      mockStatisticBase.removeListener(cb);
      expect(mockStatisticBase.getListeners()).toEqual(
        [ ],
      );
    });

    it('emit event to listeners', () => {
      mockStatisticBase.on(cb);
      mockStatisticBase.on(cb1);
      mockStatisticBase.emit({ url: 'T1' });
      expect(cb).toHaveBeenCalledWith({ url: 'T1' });
      expect(cb1).toHaveBeenCalledWith({ url: 'T1' });
    });

    it('do nothing on emit without listeners', () => {
      expect(mockStatisticBase.emit({ url: 'T1' })).toBe(false);
    });
  });
});
