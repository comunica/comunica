import { ActionObserverHttpRequests } from '../lib/ActionObserverHttpRequests';

describe('ActionObserverHttpRequests', () => {
  let observer: ActionObserverHttpRequests;
  let invalidateListeners: Function[];

  beforeEach(() => {
    invalidateListeners = [];
    observer = new ActionObserverHttpRequests({
      actors: [ <any>'registered_actor' ],
      bus: <any>{ subscribeObserver: jest.fn() },
      httpInvalidator: <any>{ addInvalidateListener: (listener: Function) => invalidateListeners.push(listener) },
      name: 'actor',
    });
  });

  it('should register requests from specified actors', () => {
    expect(observer.requests).toBe(0);
    observer.onRun(<any>'registered_actor', <any>'action', <any>'output');
    expect(observer.requests).toBe(1);
  });

  it('should ignore requests from actors that are not specified', () => {
    expect(observer.requests).toBe(0);
    observer.onRun(<any>'ignored_actor', <any>'action', <any>'output');
    expect(observer.requests).toBe(0);
  });

  it('should reset the request count on cache invalidation', () => {
    expect(observer.requests).toBe(0);
    observer.onRun(<any>'registered_actor', <any>'action', <any>'output');
    expect(observer.requests).toBe(1);
    for (const listener of invalidateListeners) {
      listener();
    }
    expect(observer.requests).toBe(0);
  });
});
