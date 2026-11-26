import { describe, expect, it } from 'vitest';
import { parseChannelInput, parseIsoDuration } from './parse';

describe('parseChannelInput', () => {
  it('parses @handles and bare handles', () => {
    expect(parseChannelInput('@mkbhd')).toEqual({ kind: 'handle', value: 'mkbhd' });
    expect(parseChannelInput('  @MrBeast  ')).toEqual({ kind: 'handle', value: 'MrBeast' });
    expect(parseChannelInput('mkbhd')).toEqual({ kind: 'handle', value: 'mkbhd' });
  });

  it('parses handle URLs', () => {
    expect(parseChannelInput('https://www.youtube.com/@mkbhd')).toEqual({
      kind: 'handle',
      value: 'mkbhd',
    });
    expect(parseChannelInput('youtube.com/@mkbhd/videos?si=abc123')).toEqual({
      kind: 'handle',
      value: 'mkbhd',
    });
    expect(parseChannelInput('m.youtube.com/@mkbhd')).toEqual({
      kind: 'handle',
      value: 'mkbhd',
    });
  });

  it('parses channel URLs and raw ids', () => {
    const id = 'UCBJycsmduvYEL83R_U4JriQ';
    expect(parseChannelInput(id)).toEqual({ kind: 'id', value: id });
    expect(parseChannelInput(`https://www.youtube.com/channel/${id}`)).toEqual({
      kind: 'id',
      value: id,
    });
    expect(parseChannelInput(`youtube.com/channel/${id}/videos`)).toEqual({
      kind: 'id',
      value: id,
    });
  });

  it('rejects empty, foreign and malformed input', () => {
    expect(parseChannelInput('')).toBeNull();
    expect(parseChannelInput('   ')).toBeNull();
    expect(parseChannelInput('https://example.com/@mkbhd')).toBeNull();
    expect(parseChannelInput('@ab')).toBeNull();
    expect(parseChannelInput('youtube.com/c/SomeName')).toBeNull();
    expect(parseChannelInput('bad handle!')).toBeNull();
  });
});

describe('parseIsoDuration', () => {
  it('parses hours, minutes and seconds', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723);
    expect(parseIsoDuration('PT45S')).toBe(45);
    expect(parseIsoDuration('PT12M')).toBe(720);
    expect(parseIsoDuration('PT1H')).toBe(3600);
  });

  it('parses days and weeks', () => {
    expect(parseIsoDuration('P1DT30S')).toBe(86_430);
    expect(parseIsoDuration('P2D')).toBe(172_800);
    expect(parseIsoDuration('P1W')).toBe(604_800);
  });

  it('handles zero durations', () => {
    expect(parseIsoDuration('PT0S')).toBe(0);
    expect(parseIsoDuration('P0D')).toBe(0);
  });

  it('returns null for invalid values', () => {
    expect(parseIsoDuration('')).toBeNull();
    expect(parseIsoDuration('P')).toBeNull();
    expect(parseIsoDuration('1H2M')).toBeNull();
    expect(parseIsoDuration('PT1H2X')).toBeNull();
  });
});
