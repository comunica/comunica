import * as S from "sparqljs";

import { AbstractFilteredStream, FilteredStream } from "../core/FilteredStreams";
import { Bindings, BindingsStream } from "../core/Bindings";
import { UnimplementedError } from "../util/Errors";
import { SyncEvaluator } from "../evaluators/SyncEvaluator";

export class SyncFilter extends AbstractFilteredStream implements FilteredStream {
    mappings: Bindings[];
    evaluator: SyncEvaluator;
    expr: S.Expression;

    constructor(expr: S.Expression, inputMappings: BindingsStream) {
        super(inputMappings);
        this.mappings = [];
        this.expr = expr;
    }

    onInputData(mapping: Bindings): void {
        this.mappings.push(mapping);
    }

    onInputEnd(): void {
        this.evaluator = new SyncEvaluator(this.expr);
        for(let mapping of this.mappings) {
            if(this.evaluate(mapping)) {
                this.emit('data', mapping)
            }
        }
        this.close();
    }

    evaluate(mapping: Bindings): boolean {
        return this.evaluator.evaluate(mapping);
    }
}