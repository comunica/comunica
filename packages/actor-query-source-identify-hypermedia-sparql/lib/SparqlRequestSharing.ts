import type { BindingsStream } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { BufferedIterator } from 'asynciterator';

/**
 * Shares identical requests of a query to a SPARQL endpoint while they are in flight,
 * so that concurrent identical requests, such as those of joins over overlapping sources, are only sent once.
 *
 * Requests are shared per scope, which is an object that identifies the query, such as its timestamp,
 * so that requests of queries with different contexts are never shared.
 * Results are not kept once a request has completed.
 */
export class SparqlRequestSharing {
  private readonly scopes = new WeakMap<object, Map<string, ISharedRequest>>();

  /**
   * @param maxBufferedBindings The maximum number of bindings of a request to keep for consumers that join it
   *                            while it is in flight. Larger results are not shared with later consumers.
   */
  public constructor(private readonly maxBufferedBindings: number) {}

  /**
   * Share a request that produces a single value, such as a COUNT query.
   * @param scope An object that identifies the query, or undefined to not share.
   * @param key A key that identifies the request, such as the query string.
   * @param send A function that sends the request.
   */
  public shareValue<T>(scope: object | undefined, key: string, send: () => Promise<T>): Promise<T> {
    const requests = this.getRequests(scope);
    if (!requests) {
      return send();
    }
    const existing = requests.get(key);
    if (existing) {
      return <Promise<T>> existing.value;
    }
    const value = send().finally(() => requests.delete(key));
    requests.set(key, { value });
    return value;
  }

  /**
   * Share a request that produces bindings, such as a SELECT query.
   * @param scope An object that identifies the query, or undefined to not share.
   * @param key A key that identifies the request, such as the query string.
   * @param send A function that sends the request.
   */
  public async shareBindings(
    scope: object | undefined,
    key: string,
    send: () => Promise<BindingsStream>,
  ): Promise<BindingsStream> {
    const requests = this.getRequests(scope);
    if (!requests) {
      return send();
    }
    const existing = requests.get(key);
    if (existing?.bindings) {
      return existing.bindings.subscribe();
    }
    const shared = new SharedBindingsRequest(send(), this.maxBufferedBindings, () => requests.delete(key));
    requests.set(key, { bindings: shared });
    return shared.subscribe();
  }

  protected getRequests(scope: object | undefined): Map<string, ISharedRequest> | undefined {
    if (!scope || this.maxBufferedBindings <= 0) {
      return undefined;
    }
    let requests = this.scopes.get(scope);
    if (!requests) {
      requests = new Map();
      this.scopes.set(scope, requests);
    }
    return requests;
  }
}

interface ISharedRequest {
  value?: Promise<unknown>;
  bindings?: SharedBindingsRequest;
}

/**
 * The bindings of a request, read as they arrive, and passed to all of its consumers.
 * Bindings are read regardless of how fast consumers read them,
 * so that a consumer never waits for another one, which could otherwise deadlock if both feed the same join.
 */
export class SharedBindingsRequest {
  private readonly subscribers = new Set<SubscriberIterator>();
  private history: RDF.Bindings[] | undefined = [];
  private stream: BindingsStream | undefined;
  private done = false;
  private error: Error | undefined;

  public constructor(
    stream: Promise<BindingsStream>,
    private readonly maxBufferedBindings: number,
    private readonly onUnshareable: () => void,
  ) {
    stream.then(
      (bindingsStream) => {
        this.stream = bindingsStream;
        bindingsStream.on('data', (bindings: RDF.Bindings) => {
          if (this.history) {
            this.history.push(bindings);
            if (this.history.length > this.maxBufferedBindings) {
              // Later consumers would need all bindings, so they send their own request instead.
              this.history = undefined;
              this.onUnshareable();
            }
          }
          for (const subscriber of this.subscribers) {
            subscriber.pushBindings(bindings);
          }
        });
        bindingsStream.on('end', () => this.finish());
        bindingsStream.on('error', (error: Error) => this.finish(error));
        if (this.subscribers.size === 0) {
          this.cancel();
        }
      },
      (error: Error) => this.finish(error),
    );
  }

  /**
   * Create a stream of all bindings of this request.
   */
  public subscribe(): BindingsStream {
    const subscriber = new SubscriberIterator(() => this.unsubscribe(subscriber));
    for (const bindings of this.history ?? []) {
      subscriber.pushBindings(bindings);
    }
    if (this.done) {
      subscriber.finish(this.error);
    } else {
      this.subscribers.add(subscriber);
    }
    return subscriber;
  }

  protected unsubscribe(subscriber: SubscriberIterator): void {
    this.subscribers.delete(subscriber);
    if (this.subscribers.size === 0 && !this.done) {
      this.cancel();
    }
  }

  /**
   * Stop the request once no consumer reads it anymore, which aborts the HTTP request.
   */
  protected cancel(): void {
    if (this.stream) {
      this.done = true;
      this.onUnshareable();
      this.stream.destroy();
    }
  }

  protected finish(error?: Error): void {
    if (this.done) {
      return;
    }
    this.done = true;
    this.error = error;
    this.onUnshareable();
    for (const subscriber of this.subscribers) {
      subscriber.finish(error);
    }
    this.subscribers.clear();
  }
}

/**
 * A stream of bindings that are pushed into it.
 */
class SubscriberIterator extends BufferedIterator<RDF.Bindings> {
  private error: Error | undefined;

  public constructor(private readonly onDestroy: () => void) {
    super({ autoStart: false, maxBufferSize: Number.POSITIVE_INFINITY });
  }

  public pushBindings(bindings: RDF.Bindings): void {
    this._push(bindings);
  }

  public finish(error?: Error): void {
    if (error) {
      // The error is emitted once the consumer reads, as it may not listen to errors before.
      this.error = error;
      this.readable = true;
    } else {
      this.close();
    }
  }

  public override _read(_count: number, done: () => void): void {
    const error = this.error;
    done();
    if (error) {
      this.destroy(error);
    }
  }

  public override _destroy(cause: Error | undefined, callback: (error?: Error) => void): void {
    this.onDestroy();
    callback();
  }
}
