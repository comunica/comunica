import {AsyncIterator} from "asynciterator";
import {ProxyIterator} from "../lib/ProxyIterator";

describe('ProxyIterator', () => {
  describe('The ProxyIterator module', () => {
    it('should be a function', () => {
      expect(ProxyIterator).toBeInstanceOf(Function);
    });

    it('should be a ProxyIterator constructor', () => {
      expect(new ProxyIterator(() => Promise.resolve(AsyncIterator.range(0, 10)))).toBeInstanceOf(ProxyIterator);
    });
  });

  describe('A ProxyIterator instance', () => {
    let iterator: ProxyIterator<number>;
    let called: boolean;

    beforeEach(() => {
      called = false;
      iterator = new ProxyIterator(() => new Promise((resolve, reject) => {
        called = true;
        resolve(AsyncIterator.range(0, 10));
      }));
    });

    it('should not create the source before the proxy is called', () => {
      return expect(called).toBeFalsy();
    });

    it('should create the source when the proxy is called', () => {
      return expect(new Promise((resolve, reject) => {
        iterator.on('data', () => {
          resolve(called);
        });
      })).resolves.toBeTruthy();
    });

    it('should emit an error on promise rejection', () => {
      return new Promise((resolve, reject) => {
        iterator = new ProxyIterator(() => Promise.reject(new Error('This should be caught')));
        iterator.on('error', () => resolve());
      });
    });
  });
});
