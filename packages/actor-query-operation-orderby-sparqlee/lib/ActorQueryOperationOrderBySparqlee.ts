import { Term } from "rdf-js";
import { termToString } from "rdf-string";
import { Algebra } from "sparqlalgebrajs";
import { AsyncEvaluator, isExpressionError } from 'sparqlee';
import { type } from 'sparqlee/dist/lib/util/Consts';

import {
  ActorQueryOperation, ActorQueryOperationTypedMediated,
  Bindings, IActorQueryOperationOutputBindings, IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import { ActionContext, IActorTest } from "@comunica/core";
import { SortIterator } from "./SortIterator";

/**
 * A comunica OrderBy Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationOrderBySparqlee extends ActorQueryOperationTypedMediated<Algebra.OrderBy> {

  private window: number;

  constructor(args: IActorQueryOperationOrderBySparqleeArgs) {
    super(args, 'orderby');
    this.window = args.window || Infinity;
  }

  public async testOperation(pattern: Algebra.OrderBy, context: ActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    for (let expr of pattern.expressions) {
      expr = this.extractSortExpression(expr);
      const _ = new AsyncEvaluator(expr);
    }
    return true;
  }

  public async runOperation(pattern: Algebra.OrderBy, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {

    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: pattern.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    const options = { window: this.window };
    const sparqleeConfig = { ...ActorQueryOperation.getExpressionContext(context) };
    let bindingsStream = output.bindingsStream;

    //sorting backwards since the first one is the most important therefore should be ordered last.
    for (let i = pattern.expressions.length-1; i >= 0 ;i--) {
      let expr = pattern.expressions[i];
      const isAscending = this.isAscending(expr);
      expr = this.extractSortExpression(expr);
      // Transform the stream by annotating it with the expr result
      const evaluator = new AsyncEvaluator(expr, sparqleeConfig);
      interface IAnnotatedBinding { bindings: Bindings; result: Term | undefined; }
      const transform = async (bindings: Bindings, next: any) => {
        try {
          const result = await evaluator.evaluate(bindings);
          transformedStream._push({ bindings, result });
        } catch (err) {
          if (!isExpressionError(err)) {
            bindingsStream.emit('error', err);
          }
          transformedStream._push({ bindings, result: undefined });
        }
        next();
      };
      const transformedStream = bindingsStream.transform<IAnnotatedBinding>({ transform });

      // Sort the annoted stream
      const sortedStream = new SortIterator(transformedStream, (a, b) => {
        const orderA = termToString(a.result);
        const orderB = termToString(b.result);
        // Type of the elements
        const typeURLA = this.getLiteralType(orderA||"");
        const typeURLB = this.getLiteralType(orderB||"");
        const typeA = type(typeURLA);
        const typeB = type(typeURLB);
        if (typeA === typeB) {
          let numA = 0;
          let numB = 0;
          let isString = true;
          switch (typeA) {
            case "integer":
              numA = parseInt(""+this.literalValue(""+termToString(a.result)));
              numB = parseInt(""+this.literalValue(""+termToString(b.result)));
              isString = false;
              break;
            case "float":
            case "decimal": 
            case "double":
              numA = parseFloat(""+this.literalValue("" + termToString(a.result)));
              numB = parseFloat(""+this.literalValue("" + termToString(b.result)));
              isString = false;
              break;
            default:
              break;
          }
          return isString ? this.order(orderA, orderB, isAscending) : this.order(numA, numB, isAscending);
        }

        //different types automatically use string compare
        return this.order(orderA, orderB, isAscending);
        
      }, options);

      // Remove the annotation
      bindingsStream = sortedStream.map(({ bindings, result }) => bindings);
    }

    return { type: 'bindings', bindingsStream, metadata: output.metadata, variables: output.variables };
  }

  // Remove descending operator if necessary
  private extractSortExpression(expr: Algebra.Expression): Algebra.Expression {
    const { expressionType, operator } = expr;
    if (expressionType !== Algebra.expressionTypes.OPERATOR) { return expr; }
    return (operator === 'desc')
      ? expr.args[0]
      : expr;
  }

  private isAscending(expr: Algebra.Expression): boolean {
    const { expressionType, operator } = expr;
    if (expressionType !== Algebra.expressionTypes.OPERATOR) { return true; }
    return operator !== 'desc';
  }

  private getLiteralType(literal: string) {
    const match = /^"[^]*"(?:\^\^([^"]+)|(@)[^@"]+)?$/.exec(literal);
    return match && match[1] || 'http://www.w3.org/2001/XMLSchema#string';
  }

  private literalValue(literal: string) {
    const match = /^"([^]*)"/.exec(literal);  
    return match && match[1];
  }

  private order(orderA:number|string|undefined, orderB: number|string|undefined, isAscending:boolean){
    if (!orderA || !orderB || orderA === orderB) {
      return 0;
    }
    return orderA > orderB === isAscending ? 1 : -1;
  }

}

/**
 * The window parameter determines how many of the elements to consider when sorting.
 */
export interface IActorQueryOperationOrderBySparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  window?: number;
}