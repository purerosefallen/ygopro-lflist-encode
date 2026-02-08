# ygopro-lflist-encode

YGOPro `lflist.conf` reader/encoder in JS/TS.

**Install**

```bash
npm install ygopro-lflist-encode
```

**Usage**

```ts
import { readFileSync } from 'node:fs';
import { YGOProLFList, YGOProLFListItem } from 'ygopro-lflist-encode';

const text = readFileSync('lflist.conf', 'utf8');
const list = new YGOProLFList().fromText(text);

// encode back
const encoded = list.toText();

// get hash for each list item
const hashes = list.items.map((item) => item.getHash());

// check a deck against a specific list item
const deck = { main: [123], extra: [], side: [] };
const error = list.items[0].checkDeck(deck);
if (error) {
  const payload = error.toPayload();
  console.log('deck error payload:', payload);
}
```

**Notes**

- `fromText` parses a single `!` section into a `YGOProLFListItem`.
- `toText` emits credit sections at the top, then `#forbidden/#limit/#semi limit`.
- `checkDeck` returns `null` when valid, otherwise `YGOProLFListError`.
