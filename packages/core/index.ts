if (!process || (process.env.NODE_ENV === 'production' && !process.env.COMUNICA_DEBUG)) {
  Error.stackTraceLimit = <any> false;
}

export * from './lib/Bus';
export * from './lib/BusIndexed';
export * from './lib/ActionObserver';
export * from './lib/Actor';
export * from './lib/Logger';
export * from './lib/Mediator';
