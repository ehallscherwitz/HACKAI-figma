import {
  BREAKPOINTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  LINE_HEIGHTS,
  LETTER_SPACINGS,
  TEXT_TRANSFORMS,
  OPACITY_OPTIONS,
  BORDER_RADII,
  BORDER_WIDTHS,
  SHADOW_STYLES,
  PADDING_OPTIONS,
  GAP_OPTIONS,
  EFFECT_OPTIONS,
} from '../lib/components';

function toCssRgb(rgb, fallback) {
  if (!rgb || typeof rgb !== 'object') return fallback;
  const clamp = (v) => Math.max(0, Math.min(255, Number(v) || 0));
  return `rgb(${clamp(rgb.r)}, ${clamp(rgb.g)}, ${clamp(rgb.b)})`;
}

const lookup = (arr, id) => arr.find((o) => o.id === id) || arr[2] || arr[0];

export default function GeneratedFrame({
  breakpoint,
  styles,
  frameState,
  pulledContent,
  framePos,
  dragging,
}) {
  const bp = BREAKPOINTS[breakpoint] || BREAKPOINTS.desktop;
  const sourceW = Number(frameState?.width) || 420;
  const sourceH = Number(frameState?.height) || 260;
  const frameW = bp.width;
  const frameH = Math.max(120, Math.round((frameW / Math.max(1, sourceW)) * sourceH));

  const maxViewW = window.innerWidth - 320;
  const maxViewH = window.innerHeight - 160;
  const scale = Math.min(maxViewW / frameW, maxViewH / Math.max(frameH, 220), 1);

  const title = pulledContent?.title || frameState?.title || 'Give your design soul';
  const subtitle = pulledContent?.subtitle || frameState?.subtitle || 'Shape polished interfaces through natural gestures and live feedback.';
  const eyebrow = pulledContent?.eyebrow || frameState?.eyebrow || 'Design System';
  const ctaText = pulledContent?.ctaText || frameState?.cta_text || 'Start Building with Tactile';
  const metaText = pulledContent?.metaText || frameState?.meta_text || 'Design meets impact';

  const styleFontSize = lookup(FONT_SIZES, styles?.fontSize).value;
  const styleFontWeight = lookup(FONT_WEIGHTS, styles?.fontWeight).value;
  const styleLineHeight = lookup(LINE_HEIGHTS, styles?.lineHeight).value;
  const styleLetterSpacing = lookup(LETTER_SPACINGS, styles?.letterSpacing).value;
  const styleTransform = lookup(TEXT_TRANSFORMS, styles?.textTransform).value;
  const styleOpacity = lookup(OPACITY_OPTIONS, styles?.opacity).value;
  const styleRadius = lookup(BORDER_RADII, styles?.borderRadius).value;
  const styleBorderWidth = lookup(BORDER_WIDTHS, styles?.borderWidth).value;
  const styleShadow = lookup(SHADOW_STYLES, styles?.shadow).value;
  const stylePadding = lookup(PADDING_OPTIONS, styles?.padding).value;
  const styleSectionGap = lookup(GAP_OPTIONS, styles?.sectionGap).value;
  const styleElementGap = lookup(GAP_OPTIONS, styles?.elementGap).value;

  const activeEffects = styles?.effects || [];
  const hasEffect = (id) => activeEffects.includes(id);
  const _ = EFFECT_OPTIONS; // keep import aligned with style-editor options
  void _;

  const bg = styles?.colorScheme?.bg || toCssRgb(frameState?.fill_rgb, '#1a1a2e');
  const text = styles?.colorScheme?.text || toCssRgb(frameState?.text_rgb, '#e8e8e8');
  const accent = styles?.colorScheme?.primary || toCssRgb(frameState?.accent_rgb, '#91bfed');
  const radius = styleRadius || `${Number(frameState?.corner_radius) || 20}px`;
  const fontFamily = styles?.font?.family || frameState?.font_family || "'Inter', sans-serif";
  const fontSize = styleFontSize || `${Math.max(16, Number(frameState?.font_size) || 24)}px`;

  return (
    <div
      className={`design-frame-wrapper${dragging ? ' dragging' : ''}`}
      style={framePos ? { left: `${framePos.x}px`, top: `${framePos.y}px` } : {}}
    >
      <div className="frame-chrome">
        <span className="frame-bp-label">{bp.label}</span>
        <span className="frame-bp-size">{bp.width}px</span>
        <div className="frame-bp-pills">
          {Object.entries(BREAKPOINTS).map(([key, val]) => (
            <span key={key} className={`frame-pill${key === breakpoint ? ' active' : ''}`}>
              {val.shortcut}
            </span>
          ))}
        </div>
      </div>

      <div
        className="generated-frame"
        style={{
          width: `${frameW}px`,
          minHeight: `${frameH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          background: bg,
          color: text,
          borderRadius: radius,
          borderWidth: styleBorderWidth,
          borderStyle: styleBorderWidth !== '0' ? 'solid' : 'none',
          borderColor: `color-mix(in srgb, ${text} 22%, transparent)`,
          boxShadow: styleShadow,
          fontFamily,
          fontWeight: styleFontWeight,
          lineHeight: styleLineHeight,
          letterSpacing: styleLetterSpacing,
          textTransform: styleTransform,
          opacity: styleOpacity,
          padding: stylePadding,
          gap: styleSectionGap,
          backdropFilter: hasEffect('layer-blur') ? 'blur(18px)' : 'none',
        }}
      >
        <div className="generated-eyebrow">{eyebrow}</div>
        <h1 className="generated-title" style={{ fontSize }}>
          {title}
        </h1>
        <p className="generated-subtitle">{subtitle}</p>
        <div className="generated-cta-row" style={{ gap: styleElementGap }}>
          <button
            type="button"
            className="generated-cta"
            style={{
              background: accent,
              color: '#ffffff',
              borderRadius: hasEffect('gradient-border') ? '999px' : radius,
              boxShadow: hasEffect('glow') ? `0 0 22px ${accent}88` : 'none',
            }}
          >
            {ctaText}
          </button>
          <span className="generated-meta">{metaText}</span>
        </div>
      </div>
    </div>
  );
}

