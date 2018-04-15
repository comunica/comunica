import * as Promise from 'bluebird';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { BufferedIterator } from 'asynciterator';
import { Bindings, BindingsStream } from '../core/Bindings';
import { EvaluatedBindings, EvaluatedStream, FilteredStream, Lookup } from '../FromExpressionStream';
import { UnimplementedError } from '../util/Errors';
import { AsyncEvaluator } from './AsyncEvaluator';

export class AsyncFilteredStream extends BufferedIterator<Bindings> implements FilteredStream {

  private _expr: Alg.Expression;
  private _evaluator: AsyncEvaluator;
  private _input: BindingsStream;

  constructor(expr: Alg.Expression, input: BindingsStream, lookup: Lookup) {
    // Autostart false might be required to allow listening to error events in first pulls
    super({ autoStart: false, maxBufferSize: 10 });
    this._evaluator = new AsyncEvaluator(expr, lookup);
    this._input = input;
    this._input.on('end', () => {
      this.close();
    });
    Promise.longStackTraces();
  }

  _read(count: number, done: () => void): void {
    const first = this._input.take(count);
    const evaluations: Array<Promise<void>> = [];

    first.on('data', (bindings) => {
      const evaluation = this._evaluate(bindings)
        .then((result) => { if (result === true) { this._push(bindings); } })
        .catch((error) => { this.emit('error', error); });
      evaluations.push(evaluation);
    });

    first.on('end', () => {
      Promise.all(evaluations)
        .then(() => done())
        .catch((error) => this.emit('error', error));
    });
  }

  // TODO
  // public async _evaluate(mapping: Bindings): Promise<boolean> {
  _evaluate(mapping: Bindings): Promise<boolean> {
    return this._evaluator.evaluateAsEBV(mapping);
  }
}

export class AsyncEvaluatedStream extends BufferedIterator<EvaluatedBindings> implements EvaluatedStream {

  private _expr: Alg.Expression;
  private _evaluator: AsyncEvaluator;
  private _input: BindingsStream;

  constructor(expr: Alg.Expression, input: BindingsStream, lookup: Lookup) {
    // Autostart false might be required to allow listening to error events in first pulls
    super({ autoStart: false, maxBufferSize: 10 });
    this._evaluator = new AsyncEvaluator(expr, lookup);
    this._input = input;
    this._input.on('end', () => {
      this.close();
    });
    Promise.longStackTraces();
  }

  _read(count: number, done: () => void): void {
    const first = this._input.take(count);
    const evaluations: Array<Promise<void>> = [];

    first.on('data', (bindings) => {
      const evaluation = this._evaluate(bindings)
        .then((result) => {
          this._push({ bindings, result });
        })
        .catch((error) => { this.emit('error', error); });
      evaluations.push(evaluation);
    });

    first.on('end', () => {
      Promise.all(evaluations)
        .then(() => done())
        .catch((error) => this.emit('error', error));
    });
  }

  // TODO
  // public async _evaluate(mapping: Bindings): Promise<boolean> {
  _evaluate(mapping: Bindings): Promise<RDF.Term> {
    return this._evaluator.evaluate(mapping);
  }
}
