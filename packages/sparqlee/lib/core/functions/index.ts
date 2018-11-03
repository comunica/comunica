import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { definitions, RegularFunction } from './RegularFunctions';
import { specialDefinitions, SpecialFunctionAsync } from './SpecialFunctionsAsync';

export { RegularFunction } from './RegularFunctions';
export { SpecialFunctionAsync } from './SpecialFunctionsAsync';

export interface SPARQLFunction<Apply extends E.Application> {
  functionClass: C.OperatorCategory;
  arity: number | number[];
  apply: Apply;
}

export type RegularFunctionMap = Map<C.RegularOperator, RegularFunction>;
export const regularFunctions: RegularFunctionMap =
  definitions
    .map((def, op) => new RegularFunction(op, def))
    .toMap();

export type SpecialFunctionAsyncMap = Map<C.SpecialOperator, SpecialFunctionAsync>;
export const specialFunctions: SpecialFunctionAsyncMap =
  specialDefinitions
    .map((def, op) => new SpecialFunctionAsync(op, def))
    .toMap();

export type FunctionMap = Map<C.Operator, SPARQLFunction<E.Application>>;
export const functions: FunctionMap =
  (specialFunctions as FunctionMap)
    .merge(regularFunctions);
