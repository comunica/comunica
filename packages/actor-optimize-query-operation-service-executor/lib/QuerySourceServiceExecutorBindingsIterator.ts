import type { Bindings, BindingsStream } from '@comunica/types';
import { BufferedIterator } from 'asynciterator';

export interface IQuerySourceServiceExecutorBindingsIteratorArgs {
  serviceBindingsPromise: Promise<BindingsStream>;
  lenient: boolean;
  silentFallback?: {
    binding: Bindings;
    metadata: Record<string, any>;
  };
}

/**
 * Bindings iterator that lazily forwards the output of a custom SERVICE executor.
 */
export class QuerySourceServiceExecutorBindingsIterator extends BufferedIterator<Bindings> {
  private readonly serviceBindingsPromise: Promise<BindingsStream>;
  private readonly lenient: boolean;
  private readonly silentFallback: IQuerySourceServiceExecutorBindingsIteratorArgs['silentFallback'];
  private started = false;
  private emittedBindings = false;
  private usedSilentFallback = false;

  public constructor(args: IQuerySourceServiceExecutorBindingsIteratorArgs) {
    super({ autoStart: false });
    this.serviceBindingsPromise = args.serviceBindingsPromise;
    this.lenient = args.lenient;
    this.silentFallback = args.silentFallback;
  }

  public override _read(_count: number, done: () => void): void {
    if (this.started) {
      done();
      return;
    }
    this.started = true;

    this.serviceBindingsPromise
      .then((serviceBindings) => {
        serviceBindings.on('data', (binding: Bindings) => {
          this.emittedBindings = true;
          this._push(binding);
        });
        serviceBindings.on('end', () => this.close());
        serviceBindings.on('error', (error) => {
          if (this.lenient && !this.emittedBindings) {
            this.emitSilentFallback();
          } else if (this.lenient) {
            this.close();
          } else {
            this.destroy(error);
          }
        });
      })
      .catch((error) => {
        if (this.lenient) {
          this.emitSilentFallback();
        } else {
          this.destroy(error);
        }
      })
      .finally(done);
  }

  private emitSilentFallback(): void {
    if (this.usedSilentFallback) {
      return;
    }
    this.usedSilentFallback = true;
    this.setProperty('metadata', this.silentFallback!.metadata);
    this.emittedBindings = true;
    this._push(this.silentFallback!.binding);
    this.close();
  }
}
