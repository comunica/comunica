import { Suite } from 'benchmark';
import { EmptyEvaluator } from './EvalEmpty';
import { ManualEvaluator } from './EvalManual';
import { SyncEvaluator } from './EvalSync';
import { example1 } from './Examples';

const suite = new Suite();

suite
    .add('Empty', () => {
        const evaluator = new SyncEvaluator(example1.expression);
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