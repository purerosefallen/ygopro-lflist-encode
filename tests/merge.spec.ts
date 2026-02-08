import {
  YGOProLFListItem,
  YGOProLFListCreditLimit,
} from '../src/lflist-item';

describe('YGOProLFListItem.merge', () => {
  it('merges entries by strictest limit and renames credit identifiers on collision', () => {
    const item1 = new YGOProLFListItem({
      name: 'A',
      entries: [
        { code: 100, limit: 2 },
        { code: 200, limit: 1 },
      ],
      creditLimits: [
        {
          identifier: 'foo',
          limit: 100,
          entries: [{ code: 1000, credit: 10 }],
        },
      ],
    });

    const item2 = new YGOProLFListItem({
      name: 'B',
      entries: [
        { code: 100, limit: 0 },
        { code: 300, limit: 2 },
      ],
      creditLimits: [
        {
          identifier: 'foo',
          limit: 200,
          entries: [{ code: 2000, credit: 20 }],
        },
        {
          identifier: 'bar',
          limit: 50,
          entries: [{ code: 3000, credit: 5 }],
        },
      ],
    });

    item1.merge(item2);

    const mergedEntries = new Map(
      item1.entries.map((entry) => [entry.code, entry.limit]),
    );
    expect(mergedEntries.get(100)).toBe(0);
    expect(mergedEntries.get(200)).toBe(1);
    expect(mergedEntries.get(300)).toBe(2);

    const identifiers = item1.creditLimits.map((limit) => limit.identifier);
    expect(identifiers).toEqual(['foo', 'foo_0', 'bar']);

    const byId = new Map<string, YGOProLFListCreditLimit>(
      item1.creditLimits.map((limit) => [limit.identifier, limit]),
    );
    expect(byId.get('foo')?.limit).toBe(100);
    expect(byId.get('foo')?.entries[0].code).toBe(1000);
    expect(byId.get('foo_0')?.limit).toBe(200);
    expect(byId.get('foo_0')?.entries[0].code).toBe(2000);
    expect(byId.get('bar')?.limit).toBe(50);
  });
});
