import { Evaluator } from "../core/Evaluator";
import { Bindings } from "../core/Bindings";

export class AsyncEvaluator implements Evaluator {

    evaluate(mapping: Bindings): boolean {
        return true;
    }
}