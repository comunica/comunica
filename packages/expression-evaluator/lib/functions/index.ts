import type * as C from '../util/Consts.js';

import {
  NamedFunction,
  RegularFunction,
  SpecialFunction,
} from './Core.js';
import { namedDefinitions } from './NamedFunctions.js';
import { definitions } from './RegularFunctions.js';
import { specialDefinitions } from './SpecialFunctions.js';

export * from './Core.js';

export type RegularFunctionMap = Record<C.RegularOperator, RegularFunction>;
export const regularFunctions: RegularFunctionMap = <RegularFunctionMap> Object.fromEntries(
  Object.entries(definitions).map(([ key, val ]) =>
    [ key, new RegularFunction(<C.RegularOperator>key, val) ]),
);

export type SpecialFunctionAsyncMap = Record<C.SpecialOperator, SpecialFunction>;
export const specialFunctions: SpecialFunctionAsyncMap = <SpecialFunctionAsyncMap>Object.fromEntries(
  Object.entries(specialDefinitions).map(([ key, val ]) => [ key, new SpecialFunction(<C.SpecialOperator>key, val) ]),
);

export type NamedFunctionMap = Record<C.NamedOperator, NamedFunction>;
export const namedFunctions: NamedFunctionMap = <NamedFunctionMap> Object.fromEntries(
  Object.entries(namedDefinitions).map(([ key, val ]) =>
    [ key, new NamedFunction(<C.NamedOperator>key, val) ]),
);
export { SearchStack } from './OverloadTree.js';
export { OverloadTree } from './OverloadTree.js';
