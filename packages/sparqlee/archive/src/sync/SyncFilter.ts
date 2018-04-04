import * as S from "sparqljs";

import {
  AbstractFilteredStream, Bindings, BindingsStream,
  IFilteredStream, Lookup,
} from "../core/FilteredStreams";
import { UnimplementedError } from "../util/Errors";
import { SyncEvaluator } from "./SyncEvaluator";

export class SyncFilter extends AbstractFilteredStream implements IFilteredStream {
  protected readonly evaluator: SyncEvaluator;
  protected readonly expr: S.Expression;

  private readonly mappings: Bindings[];

  constructor(expr: S.Expression, input: BindingsStream, lookup: Lookup) {
    super(expr, input, lookup);
    this.mappings = [];
    this.evaluator = new SyncEvaluator(this.expr);
  }

  public onInputData(mapping: Bindings): void {
    this.mappings.push(mapping);
  }

  public onInputEnd(): void {
    for (const mapping of this.mappings) {
      if (this.evaluate(mapping)) {
        this.emit('data', mapping);
      }
    }
    this.close();
  }

  public evaluate(mapping: Bindings): boolean {
    return this.evaluator.evaluate(mapping);
  }
}
