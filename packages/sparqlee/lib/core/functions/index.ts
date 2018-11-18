import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import {
  NamedFunction,
  RegularFunction,
  SpecialFunctionAsync,
} from './FunctionClasses';
import { namedDefinitions } from './NamedFunctions';
import { definitions } from './RegularFunctions';
import { specialDefinitions } from './SpecialFunctionsAsync';

export * from './FunctionClasses';

export interface SPARQLFunction<Apply extends E.Application> {
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

export type NamedFunctionMap = Map<C.NamedOperator, NamedFunction>;
export const namedFunctions: NamedFunctionMap =
  namedDefinitions
    .map((def, op) => new NamedFunction(op, def))
    .toMap();
