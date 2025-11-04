import type {
  ILink,
  BindingsStream,
  FragmentSelectorShape,
  IQuerySource,
  QuerySourceReference,
} from '@comunica/types';
import type { Quad } from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { StatisticLinkDereference } from '../lib/StatisticLinkDereference';

class MockQuerySource implements IQuerySource {
  public referenceValue: QuerySourceReference;

  public constructor(referenceValue: QuerySourceReference) {
    this.referenceValue = referenceValue;
  }

  public async getFilterFactor(): Promise<number> {
    return 0;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return <any> undefined;
  }

  public queryBindings(): BindingsStream {
    return <any> undefined;
  }

  public queryQuads(): AsyncIterator<Quad> {
    return <any> undefined;
  }

  public queryBoolean(): Promise<boolean> {
    return <any> undefined;
  }

  public queryVoid(): Promise<void> {
    return <any> undefined;
  }

  public toString(): string {
    return <any> undefined;
  }
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
