import type { ILinkQueue } from '@comunica/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LinkQueueWrapper } from '..';

describe('LinkQueueWrapper', () => {
  let wrapped: ILinkQueue;
  let wrapper: ILinkQueue;
  beforeEach(() => {
    wrapped = {
      push: vi.fn(() => true),
      getSize: vi.fn(() => 123),
      isEmpty: vi.fn(() => true),
      pop: vi.fn(() => ({ url: 'L1' })),
      peek: vi.fn(() => ({ url: 'L2' })),
    };
    wrapper = new LinkQueueWrapper(wrapped);
  });

  describe('push', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.push({ url: 'a' }, { url: 'parent' })).toBe(true);
      expect(wrapped.push).toHaveBeenCalledWith({ url: 'a' }, { url: 'parent' });
    });
  });

  describe('getSize', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.getSize()).toBe(123);
      expect(wrapped.getSize).toHaveBeenCalledTimes(1);
    });
  });

  describe('isEmpty', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.isEmpty()).toBe(true);
      expect(wrapped.isEmpty).toHaveBeenCalledTimes(1);
    });
  });

  describe('pop', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.pop()).toEqual({ url: 'L1' });
      expect(wrapped.pop).toHaveBeenCalledTimes(1);
    });
  });

  describe('peek', () => {
    it('calls the wrapped link queue', () => {
      expect(wrapper.peek()).toEqual({ url: 'L2' });
      expect(wrapped.peek).toHaveBeenCalledTimes(1);
    });
  });
});
