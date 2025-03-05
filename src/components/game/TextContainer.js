
import React from 'react';
import { formatAlternatingLines, preventWordBreaks } from '../../utils/utils';

const TextContainer = ({ encrypted, display, settings, useMobileMode }) => {
  const enc = useMobileMode ? preventWordBreaks(encrypted) : encrypted;
  const disp = useMobileMode ? preventWordBreaks(display) : display;
  const formattedText = formatAlternatingLines(enc, disp, true);

  return (
    <div
      className={`text-container ${settings.hardcoreMode ? "hardcore-mode" : ""}`}
    >
      <div
        className="alternating-text"
        dangerouslySetInnerHTML={formattedText}
      />
      {settings.hardcoreMode && (
        <div className="hardcore-badge">HARDCORE MODE</div>
      )}
    </div>
  );
};

export default TextContainer;
