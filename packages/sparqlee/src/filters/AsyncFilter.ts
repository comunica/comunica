// Imported as BPromise as to not shadow global Promise;
import * as BPromise from 'bluebird';
import * as S from 'sparqljs';

import { AbstractFilteredStream, FilteredStream } from "../core/FilteredStreams";
import { Bindings, BindingsStream } from "../core/Bindings";
import { UnimplementedError } from "../util/Errors";

export class ASyncFilter extends AbstractFilteredStream implements FilteredStream {
    evaluations: BPromise<void>[];

    constructor(expr: S.Expression, mappings: BindingsStream) {
        super(mappings);
    }

    onInputData(mapping: Bindings): void {
        let evaluation = this
            .evaluate(mapping)
            .then((result) => {
                if (result === true) { this.emit('data', mapping); }
            })
            .catch((error) => {
                console.log(error, mapping);
                throw error;
            });
        this.evaluations.push(evaluation);
    }

    onInputEnd(): void {
        BPromise
            .all(this.evaluations)
            .catch((error) => {throw error; })
            .finally(() => this.close())
    }

    evaluate(mapping: Bindings): BPromise <boolean> {
        return new BPromise((resolve, reject) => {
            return resolve(true)
        });
    }
}