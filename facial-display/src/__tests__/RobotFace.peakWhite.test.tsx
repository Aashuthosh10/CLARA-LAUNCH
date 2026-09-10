import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RobotFace from '../components/RobotFace';

describe('RobotFace peak-white expression', () => {
  it('renders expression fills as #FFFFFF without purple tint stops', () => {
    const markup = renderToStaticMarkup(
      <RobotFace isSpeaking={false} isThinking={false} isListening={false} />,
    );
    expect(markup).toContain('#FFFFFF');
    expect(markup).toContain('id="orbGradient"');
    expect(markup).toContain('id="browGradient"');
    // No lavender/purple expression palette
    expect(markup).not.toContain('#a855f7');
    expect(markup).not.toContain('168, 85, 247');
    expect(markup).not.toContain('stopOpacity="0.6"');
    expect(markup).not.toContain('stopOpacity="0.95"');
  });
});
