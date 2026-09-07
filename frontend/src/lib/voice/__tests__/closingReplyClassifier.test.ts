import { describe, expect, it } from 'vitest';
import {
  classifyClosingReply,
  stripLeadingContinue,
} from '../closingReplyClassifier';

describe('closingReplyClassifier', () => {
  it('classifies CLOSE cues', () => {
    expect(classifyClosingReply('No thanks')).toBe('CLOSE');
    expect(classifyClosingReply("That's all")).toBe('CLOSE');
    expect(classifyClosingReply('bye')).toBe('CLOSE');
    expect(classifyClosingReply('ಇಲ್ಲ')).toBe('CLOSE');
    expect(classifyClosingReply('nahi')).toBe('CLOSE');
  });

  it('classifies CONTINUE cues', () => {
    expect(classifyClosingReply('Yes')).toBe('CONTINUE');
    expect(classifyClosingReply('yeah')).toBe('CONTINUE');
    expect(classifyClosingReply('sure')).toBe('CONTINUE');
    expect(classifyClosingReply('ಹೌದು')).toBe('CONTINUE');
    expect(classifyClosingReply('haan')).toBe('CONTINUE');
  });

  it('keeps residual request after soft yes', () => {
    expect(stripLeadingContinue('Yeah, tell me about AIML.')).toBe('tell me about aiml');
    expect(classifyClosingReply('Yeah, tell me about AIML.')).toBe('CONTINUE');
  });

  it('treats longer campus questions as CONTINUE', () => {
    expect(classifyClosingReply('Tell me about Data Science fees')).toBe('CONTINUE');
  });

  it('returns AMBIGUOUS for unclear short text', () => {
    expect(classifyClosingReply('hmm')).toBe('AMBIGUOUS');
    expect(classifyClosingReply('')).toBe('AMBIGUOUS');
  });
});
