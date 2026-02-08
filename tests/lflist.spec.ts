import { readFileSync } from 'node:fs';
import { YGOProLFList } from '../src/lflist';

describe('YGOProLFList', () => {
  const files = [
    'tests/lflist.conf',
    'tests/lflist-genesys.conf',
    'tests/lflist-rd.conf',
  ];

  for (const file of files) {
    it(`encode-decode-encode stable for ${file}`, () => {
      const text = readFileSync(file, 'utf8');
      const list1 = new YGOProLFList().fromText(text);
      const encoded1 = list1.toText();
      const hash1 = list1.items.map((item) => item.getHash());

      const list2 = new YGOProLFList().fromText(encoded1);
      const encoded2 = list2.toText();
      const hash2 = list2.items.map((item) => item.getHash());

      expect(encoded2).toBe(encoded1);
      expect(hash2).toEqual(hash1);
    });
  }
});
