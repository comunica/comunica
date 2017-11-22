import { Suite } from 'benchmark';
import { EmptyEvaluator } from './EvalEmpty';
import { ManualEvaluator } from './EvalManual';
import { SyncEvaluator } from '../src/evaluator/EvalSync';
import { example1 } from './Examples';

const suite = new Suite();

console.log(JSON.stringify(example1.expression, null, 4));

const evaluator = new SyncEvaluator(example1.expression);
console.log(evaluator.evaluate(example1.mapping));

suite
    .add('Empty', () => {
        const evaluator = new EmptyEvaluator(example1.expression);
        evaluator.evaluate(example1.mapping);
    })
    .add('Manual', () => {
        const evaluator = new ManualEvaluator(example1.expression);
        evaluator.evaluate(example1.mapping);
    })
    .add('Sync', () => {
        const evaluator = new SyncEvaluator(example1.expression);
        evaluator.evaluate(example1.mapping);
    })
    .on('cycle', function (event: Event) {
        console.log(String(event.target));
    })
    .run();