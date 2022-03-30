import type { MediatorRdfReason } from '@comunica/bus-rdf-reason';
import { setReasoningStatus } from '@comunica/bus-rdf-reason';

// Returns a promise that resolves after timeout milliseconds.
function timedPromise(timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export const mediatorRdfReason = <MediatorRdfReason> {
  async mediate(action) {
    return { async execute() {
      setReasoningStatus(action.context, { type: 'full', done: timedPromise(10), reasoned: true });
    } };
  },
};
