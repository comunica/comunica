import type { Logger } from '@comunica/types';
import { ActionContextKey } from './ActionContext.js';

export const CONTEXT_KEY_LOGGER = new ActionContextKey<Logger>('@comunica/core:log');
