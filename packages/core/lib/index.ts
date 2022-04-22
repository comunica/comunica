/* eslint no-redeclare: "off" */
import { Logger as _Logger } from '@comunica/types';

// TODO: Remove this export, and move test suite to \@comunica/types in the next release
/**
 * @deprecated Logger should be imported from \@comunica/types
 */
const Logger = _Logger;
/**
 * @deprecated Logger should be imported from \@comunica/types
 */
type Logger = _Logger;

export { Logger };
export * from './ActionContext';
export * from './Bus';
export * from './BusIndexed';
export * from './ContextEntries';
export * from './ActionObserver';
export * from './Actor';
export * from './Mediator';
