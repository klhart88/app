// ============================================================================
// RealEquityIQ — HelpIcon
//
// A small "i" button that expands a short "how this page works" note directly
// below it, in normal document flow. Content comes from PAGE_HELP (see
// lib/pageHelpContent.js) keyed by `topic` — add a new topic there, then drop
// <HelpIcon topic="..." /> next to any page/section title.
//
// Deliberately inline-expand, not a popover or modal: no position:fixed, no
// z-index, no edge-collision math, no outside-click-to-dismiss wiring. It just
// toggles height in-flow, so it behaves correctly at any viewport width by
// construction — the same reasoning that drove the header-overlap fix
// elsewhere in App.jsx. See that fix's notes if a popover is ever reconsidered
// here; the same class of mobile bug is the reason it isn't one.
// ============================================================================

import { useState } from 'react';
import { theme } from '../theme.js';
import { PAGE_HELP } from '../lib/pageHelpContent.js';

export default function HelpIcon({ topic }) {
  const [open, setOpen] = useState(false);

  const content = PAGE_HELP[topic];
  if (!content) return null; // unknown topic — fail quiet, not visually broken

  return (
    <span style={{ display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Hide page info' : 'How this page works'}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '22px', height: '22px', marginLeft: '6px', padding: 0,
          background: 'transparent', border: `1.5px solid ${theme.color.line}`,
          borderRadius: '50%', cursor: 'pointer', verticalAlign: 'middle',
          color: theme.color.muted, fontSize: '13px', fontWeight: '700',
          lineHeight: 1,
        }}
      >i</button>

      {/* CHANGED: was maxHeight animated to a JS-measured scrollHeight value.
          That measurement can go stale — read before webfont metrics/line
          wrapping finish settling — which showed up as the box clipping the
          last bit of text, as if it had a fixed height with no scroll. This
          grid-rows technique animates 0fr -> 1fr instead: the browser sizes
          the row to the content's real rendered height itself, every frame,
          so there's no measurement to go stale and nothing to clip. */}
      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.2s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            marginTop: theme.space.sm, padding: '10px 14px',
            background: theme.color.soft, border: `1px solid ${theme.color.line}`,
            borderRadius: theme.radius.xs,
          }}>
            <p style={{
              margin: 0, fontSize: theme.font.size.sm, color: theme.color.muted,
              lineHeight: 1.5, textAlign: 'left',
            }}>
              {content.body}
            </p>
          </div>
        </div>
      </div>
    </span>
  );
}
