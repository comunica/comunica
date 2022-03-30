import type {
  IActionRdfParseHandle, IActorOutputRdfParseHandle, IActorTestRdfParseHandle, MediatorRdfParseHandle,
} from '@comunica/bus-rdf-parse';
import type { Actor, IActorReply } from '@comunica/core';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import
import { StreamParser } from 'n3';

export const mediatorRdfParse = <MediatorRdfParseHandle>{
  publish(action: IActionRdfParseHandle): IActorReply<
  Actor<IActionRdfParseHandle, IActorTestRdfParseHandle, IActorOutputRdfParseHandle>,
  IActionRdfParseHandle, IActorTestRdfParseHandle, IActorOutputRdfParseHandle>[] {
    return [];
  },
  async mediate(action: IActionRdfParseHandle): Promise<IActorOutputRdfParseHandle> {
    const parser = new StreamParser({
      baseIRI: action.handle.metadata!.baseIRI,
      format: 'text/n3',
    });

    return {
      handle: {
        data: <any>parser.import(action.handle.data),
      },
    };
  },
};
