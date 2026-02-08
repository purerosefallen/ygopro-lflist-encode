import { YGOProLFListItem } from './lflist-item';

export class YGOProLFList {
  items: YGOProLFListItem[] = [];

  constructor(init: Partial<YGOProLFList> = {}) {
    this.items = init.items
      ? init.items.map((item) =>
          item instanceof YGOProLFListItem
            ? new YGOProLFListItem(item)
            : new YGOProLFListItem(item as Partial<YGOProLFListItem>),
        )
      : [];
  }

  fromText(text: string) {
    this.items = [];
    const lines = text.split(/\r?\n/);
    let blockLines: string[] = [];
    const flushBlock = () => {
      if (blockLines.length === 0) return;
      const item = new YGOProLFListItem().fromText(blockLines.join('\n'));
      if (item.name) {
        this.items.push(item);
      }
      blockLines = [];
    };
    for (const rawLine of lines) {
      if (rawLine.startsWith('#')) continue;
      if (rawLine.startsWith('!')) {
        flushBlock();
        blockLines.push(rawLine);
        continue;
      }
      if (blockLines.length > 0) {
        blockLines.push(rawLine);
      }
    }
    flushBlock();
    return this;
  }

  toText() {
    const header = `#${this.items.map((item) => `[${item.name}]`).join('')}`;
    const body = this.items.map((item) => item.toText()).join('\n\n');
    return `${header}\n${body}\n`;
  }
}
