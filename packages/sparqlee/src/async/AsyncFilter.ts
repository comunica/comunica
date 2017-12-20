// Imported as BPromise as to not shadow global Promise;
import * as BlueBird from 'bluebird';
import * as S from 'sparqljs';

import {
  AbstractFilteredStream, Bindings, BindingsStream, IFilteredStream, Lookup,
} from '../core/FilteredStreams';
import { UnimplementedError } from '../util/Errors';
import { AsyncEvaluator } from './AsyncEvaluator';

export class ASyncFilter extends AbstractFilteredStream implements IFilteredStream {

  protected readonly expr: S.Expression;
  protected readonly evaluator: AsyncEvaluator;

  private readonly evaluations: Promise<void>[];

  constructor(expr: S.Expression, input: BindingsStream, lookup: Lookup) {
    super(expr, input, lookup);
    this.evaluations = [];
    this.evaluator = new AsyncEvaluator();
  }

  public onInputData(mapping: Bindings): void {
    const evaluation = this
      .evaluate(mapping)
      .then((result) => {
        if (result === true) { this.emit('data', mapping); }
      })
      .catch((error) => {
        throw error;
      });
    this.evaluations.push(evaluation);
  }

  public onInputEnd(): void {
    BlueBird
      .all(this.evaluations)
      .catch((error) => { throw error; })
      .finally(() => this.close());
  }

  public async evaluate(mapping: Bindings): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      return resolve(true);
    });
  }
}
