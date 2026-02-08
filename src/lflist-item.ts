import { YGOProDeckLike } from 'ygopro-deck-encode';
import { YGOProLFListError, YGOProLFListErrorReason } from './lflist-error';

export interface YGOProLFListEntry {
  code: number;
  limit: number;
  comment?: string;
}

export interface YGOProLFListCreditLimitEntry {
  code: number;
  credit: number;
  comment?: string;
}

export interface YGOProLFListCreditLimit {
  identifier: string;
  limit: number;
  comment?: string;
  entries: YGOProLFListCreditLimitEntry[];
}

export class YGOProLFListItem {
  name = '';
  entries: YGOProLFListEntry[] = [];
  creditLimits: YGOProLFListCreditLimit[] = [];

  constructor(init: Partial<YGOProLFListItem> = {}) {
    this.name = init.name ?? '';
    this.entries = init.entries ? init.entries.map((e) => ({ ...e })) : [];
    this.creditLimits = init.creditLimits
      ? init.creditLimits.map((e) => ({
          ...e,
          entries: e.entries ? e.entries.map((entry) => ({ ...entry })) : [],
        }))
      : [];
  }

  fromText(text: string) {
    this.entries = [];
    this.creditLimits = [];
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
      if (!rawLine) continue;
      if (rawLine.startsWith('#')) continue;
      if (rawLine.startsWith('!')) {
        this.name = rawLine.slice(1).trim();
        continue;
      }
      let line = rawLine;
      let comment: string | undefined;
      const commentIndex = line.indexOf('--');
      if (commentIndex >= 0) {
        comment = line.slice(commentIndex + 2);
        line = line.slice(0, commentIndex);
      }
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('$')) {
        const rest = trimmed.slice(1).trim();
        const match = rest.match(/^(\S+)\s+(\d+)\s*$/);
        if (!match) continue;
        const identifier = match[1];
        const limit = parseInt(match[2], 10);
        if (Number.isNaN(limit)) continue;
        const entry: YGOProLFListCreditLimit = {
          identifier,
          limit,
          entries: [],
        };
        if (comment !== undefined && comment !== '') {
          entry.comment = comment;
        }
        const existingIndex = this.creditLimits.findIndex(
          (item) => item.identifier === identifier,
        );
        if (existingIndex >= 0) {
          this.creditLimits[existingIndex] = {
            ...this.creditLimits[existingIndex],
            ...entry,
          };
        } else {
          this.creditLimits.push(entry);
        }
        continue;
      }
      const codeMatch = trimmed.match(/^(\d+)\s+(.*)$/);
      if (!codeMatch) continue;
      const code = parseInt(codeMatch[1], 10);
      if (Number.isNaN(code)) continue;
      let rest = codeMatch[2].trim();
      if (rest.startsWith('$')) {
        rest = rest.slice(1).trim();
        const creditMatch = rest.match(/^(\S+)\s+(\d+)\s*$/);
        if (!creditMatch) continue;
        const identifier = creditMatch[1];
        const credit = parseInt(creditMatch[2], 10);
        if (Number.isNaN(credit)) continue;
        let limit = this.creditLimits.find(
          (item) => item.identifier === identifier,
        );
        if (!limit) {
          limit = { identifier, limit: 0, entries: [] };
          this.creditLimits.push(limit);
        }
        const entry: YGOProLFListCreditLimitEntry = { code, credit };
        if (comment !== undefined && comment !== '') {
          entry.comment = comment;
        }
        limit.entries.push(entry);
        continue;
      }
      const limitMatch = rest.match(/^(\d+)\s*$/);
      if (!limitMatch) continue;
      const limit = parseInt(limitMatch[1], 10);
      if (Number.isNaN(limit)) continue;
      if (limit < 0 || limit > 2) continue;
      const entry: YGOProLFListEntry = { code, limit };
      if (comment !== undefined && comment !== '') {
        entry.comment = comment;
      }
      this.entries.push(entry);
    }
    return this;
  }

  toText() {
    const lines: string[] = [];
    lines.push(`!${this.name}`);
    for (const credit of this.creditLimits) {
      lines.push(`#credit ${credit.identifier}`);
      const limitComment =
        credit.comment !== undefined && credit.comment !== ''
          ? ` --${credit.comment}`
          : '';
      lines.push(`$${credit.identifier} ${credit.limit}${limitComment}`);
      for (const entry of credit.entries) {
        const comment =
          entry.comment !== undefined && entry.comment !== ''
            ? ` --${entry.comment}`
            : '';
        const codeStr = entry.code.toString().padStart(8, '0');
        lines.push(
          `${codeStr} $${credit.identifier} ${entry.credit}${comment}`,
        );
      }
    }
    const pushGroup = (title: string, limit: number) => {
      const groupEntries = this.entries.filter((entry) => entry.limit === limit);
      if (groupEntries.length === 0) return;
      lines.push(`#${title}`);
      for (const entry of groupEntries) {
        const codeStr = entry.code.toString().padStart(8, '0');
        const comment =
          entry.comment !== undefined && entry.comment !== ''
            ? ` --${entry.comment}`
            : '';
        lines.push(`${codeStr} ${entry.limit}${comment}`);
      }
    };
    pushGroup('forbidden', 0);
    pushGroup('limit', 1);
    pushGroup('semi limit', 2);
    return lines.join('\n');
  }

  checkDeck(deck: YGOProDeckLike | number[]): YGOProLFListError | null {
    const cards = Array.isArray(deck)
      ? deck
      : [...deck.main, ...deck.extra, ...deck.side];
    const counts = new Map<number, number>();
    for (const code of cards) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    for (const entry of this.entries) {
      const count = counts.get(entry.code) ?? 0;
      if (count > entry.limit) {
        return new YGOProLFListError(
          YGOProLFListErrorReason.LFLIST,
          entry.code,
        );
      }
    }
    if (this.creditLimits.length > 0) {
      const creditUsed = new Map<string, number>();
      for (const [code, count] of counts) {
        for (const limit of this.creditLimits) {
          const entry = limit.entries.find((item) => item.code === code);
          if (!entry) continue;
          const used = creditUsed.get(limit.identifier) ?? 0;
          const next = used + entry.credit * count;
          if (next > limit.limit) {
            return new YGOProLFListError(YGOProLFListErrorReason.LFLIST, code);
          }
          creditUsed.set(limit.identifier, next);
        }
      }
    }
    return null;
  }

  getHash() {
    let hash = 0x7dfcee6a;
    const encoder = new TextEncoder();
    const creditHash = (value: string) => {
      let h = 0x811c9dc5;
      const bytes = encoder.encode(value);
      for (const b of bytes) {
        h ^= b;
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h >>> 0;
    };
    const creditUpdateHash = (h: number, a: number, b: number, c: number) => {
      const partA = ((a << 18) | (a >>> 14)) >>> 0;
      const partB = ((b << 9) | (b >>> 23)) >>> 0;
      const partC = ((c << 27) | (c >>> 5)) >>> 0;
      return (h ^ partA ^ partB ^ partC) >>> 0;
    };
    for (const limit of this.creditLimits) {
      hash = creditUpdateHash(
        hash,
        creditHash(limit.identifier),
        limit.limit >>> 0,
        0x43524544,
      );
    }
    for (const limit of this.creditLimits) {
      for (const entry of limit.entries) {
        hash = creditUpdateHash(
          hash,
          entry.code >>> 0,
          creditHash(limit.identifier),
          entry.credit >>> 0,
        );
      }
    }
    for (const entry of this.entries) {
      const code = entry.code >>> 0;
      const count = entry.limit;
      const a = ((code << 18) | (code >>> 14)) >>> 0;
      const b = ((code << (27 + count)) | (code >>> (5 - count))) >>> 0;
      hash = (hash ^ a ^ b) >>> 0;
    }
    return hash >>> 0;
  }

  merge(...items: YGOProLFListItem[]) {
    const all = [this, ...items];
    const mergedEntries = new Map<number, YGOProLFListEntry>();
    const mergedCredits: YGOProLFListCreditLimit[] = [];
    const usedIdentifiers = new Map<string, number>();

    const reserveIdentifier = (identifier: string) => {
      if (!usedIdentifiers.has(identifier)) {
        usedIdentifiers.set(identifier, 0);
        return identifier;
      }
      let index = usedIdentifiers.get(identifier) ?? 0;
      let candidate = `${identifier}_${index}`;
      while (usedIdentifiers.has(candidate)) {
        index += 1;
        candidate = `${identifier}_${index}`;
      }
      usedIdentifiers.set(identifier, index + 1);
      usedIdentifiers.set(candidate, 0);
      return candidate;
    };

    for (const item of all) {
      for (const entry of item.entries) {
        const existing = mergedEntries.get(entry.code);
        if (!existing || entry.limit < existing.limit) {
          mergedEntries.set(entry.code, { ...entry });
        }
      }
      for (const credit of item.creditLimits) {
        const identifier = reserveIdentifier(credit.identifier);
        mergedCredits.push({
          identifier,
          limit: credit.limit,
          comment: credit.comment,
          entries: credit.entries.map((entry) => ({ ...entry })),
        });
      }
    }

    this.entries = Array.from(mergedEntries.values());
    this.creditLimits = mergedCredits;
    return this;
  }
}
