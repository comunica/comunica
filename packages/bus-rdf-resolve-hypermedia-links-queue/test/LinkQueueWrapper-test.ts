import type { ILinkQueue } from '..';
import { LinkQueueWrapper } from '..';

describe('LinkQueueWrapper', () => {
  let wrapped: ILinkQueue;
  let wrapper: ILinkQueue;
  beforeEach(() => {
    wrapped = {
      push: jest.fn(() => true),
      getSize: jest.fn(() => 123),
      isEmpty: jest.fn(() => true),
      pop: jest.fn(() => ({ url: 'L1' })),
      peek: jest.fn(() => ({ url: 'L2' })),
    };
    wrapper = new LinkQueueWrapper(wrapped);
  });

  describe('push', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.push({ url: 'a' }, { url: 'parent' })).toEqual(true);
      expect(wrapped.push).toHaveBeenCalledWith({ url: 'a' }, { url: 'parent' });
    });
  });

  describe('getSize', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.getSize()).toEqual(123);
      expect(wrapped.getSize).toHaveBeenCalled();
    });
  });

  describe('isEmpty', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.isEmpty()).toEqual(true);
      expect(wrapped.isEmpty).toHaveBeenCalled();
    });
  });

  describe('pop', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.pop()).toEqual({ url: 'L1' });
      expect(wrapped.pop).toHaveBeenCalled();
    });
  });

  describe('peek', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.peek()).toEqual({ url: 'L2' });
      expect(wrapped.peek).toHaveBeenCalled();
    });
  });
});
