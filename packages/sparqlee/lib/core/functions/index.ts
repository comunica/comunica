import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { definitions, specialDefinitions } from './Definitions';
import { SpecialFunc } from './SpecialFunctionsAsync';
import { RegularFunction } from './Types';

export interface SPARQLFunction<Apply extends E.Application> {
  functionClass: 'regular' | 'special';
  arity: number | number[];
  apply: Apply;
}

export type RegularFunc = SPARQLFunction<E.SimpleApplication> & {
  functionClass: 'regular';
};

export const regularFunctions: Map<C.Operator, RegularFunc> =
  definitions.map((def, op) => new RegularFunction(op, def)).toMap();

export const specialFunctions: Map<C.SpecialOperator, SpecialFunc> =
  specialDefinitions.map((def, op) => def).toMap();

export const functions: Map<C.OperatorAll, SPARQLFunction<E.Application>> =
  // Immutable has some inflexible typing here
  // tslint:disable-next-line:no-any
  regularFunctions.merge(specialFunctions as any);
