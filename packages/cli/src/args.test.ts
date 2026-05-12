import { describe, expect, it } from 'vitest';
import { HELP_TEXT, parseArgs } from './args.js';

describe('parseArgs — positional + recipient', () => {
  it('parses positional recipient', () => {
    expect(parseArgs(['0812345678'])).toMatchObject({ recipient: '0812345678' });
  });

  it('parses --recipient flag', () => {
    expect(parseArgs(['--recipient', '0812345678']).recipient).toBe('0812345678');
  });

  it('parses -r short form', () => {
    expect(parseArgs(['-r', '0812345678']).recipient).toBe('0812345678');
  });

  it('parses --recipient=VALUE syntax', () => {
    expect(parseArgs(['--recipient=0812345678']).recipient).toBe('0812345678');
  });

  it('first positional becomes recipient', () => {
    expect(parseArgs(['0812345678', '--amount', '50']).recipient).toBe('0812345678');
  });
});

describe('parseArgs — amount', () => {
  it('parses --amount with separate value', () => {
    expect(parseArgs(['-r', '0812345678', '--amount', '50']).amount).toBe(50);
  });

  it('parses -a short form', () => {
    expect(parseArgs(['-r', '0812345678', '-a', '50']).amount).toBe(50);
  });

  it('parses --amount=VALUE', () => {
    expect(parseArgs(['-r', '0812345678', '--amount=50.5']).amount).toBe(50.5);
  });

  it('parses fractional amounts', () => {
    expect(parseArgs(['-r', '0812345678', '-a', '99.99']).amount).toBe(99.99);
  });

  it('parses zero (caller decides what to do)', () => {
    expect(parseArgs(['-r', '0812345678', '-a', '0']).amount).toBe(0);
  });
});

describe('parseArgs — --satang flag', () => {
  it('sets fromSatang true', () => {
    expect(parseArgs(['0812345678', '--amount', '5000', '--satang']).fromSatang).toBe(true);
  });

  it('omits fromSatang when not given', () => {
    expect(parseArgs(['0812345678', '--amount', '50']).fromSatang).toBeUndefined();
  });
});

describe('parseArgs — --type', () => {
  it.each(['mobile', 'nationalId', 'eWallet'] as const)('accepts %s', (type) => {
    expect(parseArgs(['0812345678', '--type', type]).type).toBe(type);
  });

  it('rejects unknown values', () => {
    expect(() => parseArgs(['0812345678', '--type', 'unknown'])).toThrow(/Unknown --type/);
  });
});

describe('parseArgs — --ecc', () => {
  it.each(['L', 'M', 'Q', 'H'] as const)('accepts %s', (level) => {
    expect(parseArgs(['0812345678', '--ecc', level]).errorCorrection).toBe(level);
  });

  it('uppercases lowercase input', () => {
    expect(parseArgs(['0812345678', '--ecc', 'h']).errorCorrection).toBe('H');
    expect(parseArgs(['0812345678', '--ecc', 'm']).errorCorrection).toBe('M');
  });

  it('rejects unknown levels', () => {
    expect(() => parseArgs(['0812345678', '--ecc', 'X'])).toThrow(/Unknown --ecc/);
  });

  it('accepts --error-correction long form', () => {
    expect(parseArgs(['0812345678', '--error-correction', 'H']).errorCorrection).toBe('H');
  });
});

describe('parseArgs — --format', () => {
  it.each(['card', 'matrix', 'payload'] as const)('accepts %s', (fmt) => {
    expect(parseArgs(['0812345678', '--format', fmt]).format).toBe(fmt);
  });

  it('rejects unknown --format', () => {
    expect(() => parseArgs(['0812345678', '--format', 'lol'])).toThrow(/Unknown --format/);
  });

  it('accepts -f short form', () => {
    expect(parseArgs(['0812345678', '-f', 'matrix']).format).toBe('matrix');
  });
});

describe('parseArgs — --theme', () => {
  it.each(['color', 'silhouette'] as const)('accepts %s', (theme) => {
    expect(parseArgs(['0812345678', '--theme', theme]).theme).toBe(theme);
  });

  it('rejects unknown --theme', () => {
    expect(() => parseArgs(['0812345678', '--theme', 'unicorn'])).toThrow(/Unknown --theme/);
  });
});

describe('parseArgs — --merchant + --output + --size', () => {
  it('reads --merchant', () => {
    expect(parseArgs(['0812345678', '--merchant', 'Acme Coffee']).merchantName).toBe('Acme Coffee');
  });

  it('reads -m short form', () => {
    expect(parseArgs(['0812345678', '-m', 'Acme']).merchantName).toBe('Acme');
  });

  it('reads --output', () => {
    expect(parseArgs(['0812345678', '--output', 'qr.svg']).output).toBe('qr.svg');
  });

  it('reads -o short form', () => {
    expect(parseArgs(['0812345678', '-o', 'qr.svg']).output).toBe('qr.svg');
  });

  it('reads --size as integer', () => {
    expect(parseArgs(['0812345678', '--size', '512']).size).toBe(512);
  });
});

describe('parseArgs — help / version', () => {
  it('handles -h', () => {
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('handles --help', () => {
    expect(parseArgs(['--help']).help).toBe(true);
  });

  it('handles -v', () => {
    expect(parseArgs(['-v']).version).toBe(true);
  });

  it('handles --version', () => {
    expect(parseArgs(['--version']).version).toBe(true);
  });
});

describe('parseArgs — error handling', () => {
  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--what', 'now'])).toThrow(/Unknown flag/);
  });

  it('throws when a flag expecting a value is at end of argv', () => {
    expect(() => parseArgs(['--amount'])).toThrow(/expects a value/);
  });

  it('throws for unknown short form', () => {
    expect(() => parseArgs(['-x', 'value'])).toThrow(/Unknown flag/);
  });
});

describe('parseArgs — combined flags', () => {
  it('parses a full real-world invocation', () => {
    const out = parseArgs([
      '0812345678',
      '--amount',
      '50.50',
      '--merchant',
      'Acme Coffee',
      '--ecc',
      'H',
      '--theme',
      'color',
      '-o',
      'qr.svg',
    ]);
    expect(out).toMatchObject({
      recipient: '0812345678',
      amount: 50.5,
      merchantName: 'Acme Coffee',
      errorCorrection: 'H',
      theme: 'color',
      output: 'qr.svg',
    });
  });

  it('last value wins on repeated flag', () => {
    expect(parseArgs(['-a', '10', '-a', '20']).amount).toBe(20);
  });
});

describe('HELP_TEXT', () => {
  it('mentions every primary flag', () => {
    const flags = [
      '--recipient',
      '--amount',
      '--type',
      '--ecc',
      '--format',
      '--theme',
      '--merchant',
      '--output',
      '--size',
      '--satang',
    ];
    for (const flag of flags) {
      expect(HELP_TEXT).toContain(flag);
    }
  });

  it('shows usage banner', () => {
    expect(HELP_TEXT).toMatch(/USAGE/);
    expect(HELP_TEXT).toMatch(/OPTIONS/);
  });

  it('shows example invocations', () => {
    expect(HELP_TEXT).toContain('EXAMPLES');
  });
});
