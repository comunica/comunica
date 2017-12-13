import { Bindings } from "./Bindings";

export interface Evaluator {
    evaluate(mapping: Bindings): boolean
}