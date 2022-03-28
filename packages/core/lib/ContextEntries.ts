import { ActionContextKey } from './ActionContext';
import type { Logger } from '@comunica/types';

export const CONTEXT_KEY_LOGGER = new ActionContextKey<Logger>('@comunica/core:log');
