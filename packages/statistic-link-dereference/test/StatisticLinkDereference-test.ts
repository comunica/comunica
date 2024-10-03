import type {
  ILink,
  BindingsStream,
  FragmentSelectorShape,
  IActionContext,
  IQueryBindingsOptions,
  IQuerySource,
  QuerySourceReference,
} from '@comunica/types';
import type { Quad } from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Operation, Ask, Update } from 'sparqlalgebrajs/lib/algebra';
import { StatisticLinkDereference } from '../lib/StatisticLinkDereference';

class MockQuerySource implements IQuerySource {
  public referenceValue: QuerySourceReference;

  public constructor(referenceValue: QuerySourceReference) {
    this.referenceValue = referenceValue;
  }

  public getSelectorShape: (context: IActionContext) => Promise<FragmentSelectorShape>;
  public queryBindings: (operation: Operation, context: IActionContext, options?: IQueryBindingsOptions | undefined)
  => BindingsStream;

  public queryQuads: (operation: Operation, context: IActionContext) => AsyncIterator<Quad>;
  public queryBoolean: (operation: Ask, context: IActionContext) => Promise<boolean>;
  public queryVoid: (operation: Update, context: IActionContext) => Promise<void>;
  public toString: () => string;
}

describe('StatisticLinkDereference', () => {
  let statisticLinkDereference: StatisticLinkDereference;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
    statisticLinkDereference = new StatisticLinkDereference();
  });

  describe('An StatisticLinkDereference instance should', () => {
    let link: ILink;
    let source: IQuerySource;
    let cb: (data: ILink) => void;

    beforeEach(() => {
      link = { url: 'url', metadata: { key: 'value' }};
      cb = jest.fn(() => {});

      source = new MockQuerySource('url');
    });

    it('emit event on update', () => {
      statisticLinkDereference.on(cb);
      statisticLinkDereference.updateStatistic(link, source);
      expect(cb).toHaveBeenCalledWith(
        {
          url: 'url',
          metadata: {
            type: 'MockQuerySource',
            dereferenceOrder: 0,
            dereferencedTimestamp: performance.now(),
            key: 'value',
          },
        },
      );
    });
    it('correctly emit multiple events', () => {
      statisticLinkDereference.on(cb);
      statisticLinkDereference.updateStatistic(link, source);
      statisticLinkDereference.updateStatistic(link, source);
      expect(cb).toHaveBeenNthCalledWith(1, {
        url: 'url',
        metadata: {
          type: 'MockQuerySource',
          dereferenceOrder: 0,
          dereferencedTimestamp: performance.now(),
          key: 'value',
        },
      });
      expect(cb).toHaveBeenNthCalledWith(2, {
        url: 'url',
        metadata: {
          type: 'MockQuerySource',
          dereferenceOrder: 1,
          dereferencedTimestamp: performance.now(),
          key: 'value',
        },
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
