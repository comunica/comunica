import { Bindings, IEvaluator } from "../core/FilteredStreams";

export class AsyncEvaluator implements IEvaluator {
  public evaluate(mapping: Bindings): boolean {
    return true;
  }
}
