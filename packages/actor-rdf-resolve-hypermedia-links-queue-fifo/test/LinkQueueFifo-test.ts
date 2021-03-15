import { LinkQueueFifo } from '..';

describe('LinkQueueFifo', () => {
  let queue: LinkQueueFifo;

  beforeEach(() => {
    queue = new LinkQueueFifo();
  });

  describe('push', () => {
    it('increases the internal array size', () => {
      queue.push({ url: 'a' });
      queue.push({ url: 'b' });
      queue.push({ url: 'c' });
      expect(queue.links).toEqual([
        { url: 'a' },
        { url: 'b' },
        { url: 'c' },
      ]);
    });
  });

  describe('getSize', () => {
    it('checks the internal array size', () => {
      expect(queue.getSize()).toEqual(0);
      expect(queue.push({ url: 'a' })).toBeTruthy();
      expect(queue.getSize()).toEqual(1);
      expect(queue.push({ url: 'b' })).toBeTruthy();
      expect(queue.getSize()).toEqual(2);
      expect(queue.push({ url: 'c' })).toBeTruthy();
      expect(queue.getSize()).toEqual(3);
    });
  });

  describe('isEmpty', () => {
    it('checks the internal array size', () => {
      expect(queue.isEmpty()).toBeTruthy();
      queue.push({ url: 'a' });
      expect(queue.isEmpty()).toBeFalsy();
      queue.push({ url: 'b' });
      expect(queue.isEmpty()).toBeFalsy();
      queue.push({ url: 'c' });
      expect(queue.isEmpty()).toBeFalsy();
    });
  });

  describe('pop', () => {
    it('reduces internal array size', () => {
      queue.push({ url: 'a' });
      queue.push({ url: 'b' });
      queue.push({ url: 'c' });

      expect(queue.pop()).toEqual({ url: 'a' });
      expect(queue.links).toEqual([
        { url: 'b' },
        { url: 'c' },
      ]);

      expect(queue.pop()).toEqual({ url: 'b' });
      expect(queue.links).toEqual([
        { url: 'c' },
      ]);

      expect(queue.pop()).toEqual({ url: 'c' });
      expect(queue.links).toEqual([]);
    });
  });

  describe('peek', () => {
    it('does not change internal array size', () => {
      queue.push({ url: 'a' });
      queue.push({ url: 'b' });
      queue.push({ url: 'c' });

      expect(queue.peek()).toEqual({ url: 'a' });
      expect(queue.links).toEqual([
        { url: 'a' },
        { url: 'b' },
        { url: 'c' },
      ]);
    });
  });
});
