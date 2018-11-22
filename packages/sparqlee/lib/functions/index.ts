import { Map } from 'immutable';

import * as E from '../expressions';
import * as C from '../util/Consts';

import {
  NamedFunction,
  RegularFunction,
  SpecialFunction,
} from './FunctionClasses';
import { namedDefinitions } from './NamedFunctions';
import { definitions } from './RegularFunctions';
import { specialDefinitions } from './SpecialFunctions';

export * from './FunctionClasses';

export type RegularFunctionMap = Map<C.RegularOperator, RegularFunction>;
export const regularFunctions: RegularFunctionMap =
  definitions
    .map((def, op) => new RegularFunction(op, def))
    .toMap();

export type SpecialFunctionAsyncMap = Map<C.SpecialOperator, SpecialFunction>;
export const specialFunctions: SpecialFunctionAsyncMap =
  specialDefinitions
    .map((def, op) => new SpecialFunction(op, def))
    .toMap();

export type NamedFunctionMap = Map<C.NamedOperator, NamedFunction>;
export const namedFunctions: NamedFunctionMap =
  namedDefinitions
    .map((def, op) => new NamedFunction(op, def))
    .toMap();
