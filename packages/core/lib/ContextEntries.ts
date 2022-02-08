import { ActionContextKey } from './ActionContext';
import type { Logger } from './Logger';

export const CONTEXT_KEY_LOGGER = new ActionContextKey<Logger>('@comunica/core:log');
