import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { definitions, specialDefinitions } from './Definitions';
import { RegularFunction } from './Types';

export type SPARQLFunction = RegularFunc | SpecialFunc;
export interface RegularFunc {
  functionClass: 'regular';
  arity: number | number[];
  apply: E.SimpleApplication;
}
export interface SpecialFunc {
  functionClass: 'special';
  arity: number;
  apply: E.SpecialApplication;
}

export const regularFunctions: Map<C.Operator, RegularFunc> =
  definitions.map((def, op) => new RegularFunction(op, def)).toMap();

export const specialFunctions: Map<C.SpecialOperator, SpecialFunc> =
  specialDefinitions.map((def, op) => new def.constructor()).toMap();

export const functions: Map<C.OperatorAll, SPARQLFunction> =
  // Immutable has some inflexible typing here
  // tslint:disable-next-line:no-any
  regularFunctions.merge(specialFunctions as any);
