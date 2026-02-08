export enum YGOProLFListErrorReason {
  LFLIST = 0x1,
  OCGONLY = 0x2,
  TCGONLY = 0x3,
  UNKNOWNCARD = 0x4,
  CARDCOUNT = 0x5,
  MAINCOUNT = 0x6,
  EXTRACOUNT = 0x7,
  SIDECOUNT = 0x8,
  NOTAVAIL = 0x9,
}

export class YGOProLFListError {
  reason: YGOProLFListErrorReason;
  code: number;

  constructor(reason: YGOProLFListErrorReason, code: number = 0) {
    this.reason = reason;
    this.code = code >>> 0;
  }

  toPayload() {
    return (((this.reason & 0xf) << 28) | (this.code & 0x0fffffff)) >>> 0;
  }
}
