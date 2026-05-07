import type { Logger } from '@comunica/types';
import { ActionContextKey } from './ActionContext';

/**
 * Context key for the logger instance used by actors in the pipeline.
 */
export const CONTEXT_KEY_LOGGER = new ActionContextKey<Logger>('@comunica/core:log');
