import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CREATORS_FIVE } from '../data/aboutData';
import { CreatorModal } from '../components/CreatorModal';

describe('About Me creators', () => {
  it('does not include Chinmayi Shastry L', () => {
    const names = CREATORS_FIVE.map((c) => c.name.toUpperCase());
    expect(names).not.toContain('CHINMAYI SHASTRY L');
    expect(names.some((n) => n.includes('CHINMAYI'))).toBe(false);
    expect(CREATORS_FIVE).toHaveLength(4);
    expect(CREATORS_FIVE.map((c) => c.id)).toEqual(['c1', 'c2', 'c4', 'c5']);
  });

  it('does not render social or email hyperlinks in expanded creator profiles', () => {
    for (const creator of CREATORS_FIVE) {
      const markup = renderToStaticMarkup(
        createElement(CreatorModal, { creator, onClose: () => undefined }),
      );

      expect(markup).not.toContain('title="GitHub"');
      expect(markup).not.toContain('title="LinkedIn"');
      expect(markup).not.toContain('title="Email Contact"');
      expect(markup).not.toContain('href="https://github.com"');
      expect(markup).not.toContain('href="https://linkedin.com"');
      expect(markup).not.toContain('href="mailto:');
    }
  });
});
