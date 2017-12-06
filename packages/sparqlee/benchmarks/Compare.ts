import { Suite } from 'benchmark';
import { EmptyEvaluator } from './EvalEmpty';
import { ManualEvaluator } from './EvalManual';
import { SyncEvaluator } from '../src/evaluator/EvalSync';
import { example1 } from './Examples';


// Context
console.log(JSON.stringify(example1.expression, null, 4));
const evaluator = new ManualEvaluator(example1.expression);
console.log(evaluator.evaluate(example1.mapping));

// Different evaluators
console.log("Total\n=====");
const total = new Suite('Total');
total
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
    .run({async: false});


// Same evaluators, different mapping
console.log("\nEvaluating\n=====")
const empty = new EmptyEvaluator(example1.expression);
const manual = new ManualEvaluator(example1.expression);
const sync = new ManualEvaluator(example1.expression);
const evaluate = new Suite('Evaluating');
evaluate
    .add('Empty', () => {
        empty.evaluate(example1.mapping);
    })
    .add('Manual', () => { 
        manual.evaluate(example1.mapping);
    })
    .add('Sync', () => {
        sync.evaluate(example1.mapping);
    })
    .on('cycle', function (event: Event) {
        console.log(String(event.target));
    })
    .run({async: false});

// Different evaluators
console.log("\nParsing\n=====");
const parse = new Suite('Parsing');
parse
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
    .run({async: false});
