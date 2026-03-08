import { useState, useRef, useEffect, useCallback } from 'react';
import { createEngine } from './engine';
import {
  BREAKPOINTS,
  FONT_OPTIONS,
  COLOR_SCHEMES,
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
} from './lib/components';
import TopBar from './components/TopBar';
import StatusBar from './components/StatusBar';
import Legend from './components/Legend';
import LoadingScreen from './components/LoadingScreen';
import AsciiCloudHome from './components/AsciiCloudHome';
import Toast from './components/Toast';
import DesignFrame from './components/DesignFrame';
import GeneratedFrame from './components/GeneratedFrame';
import StyleEditor from './components/StyleEditor';

const DEFAULT_STYLES = {
  font: FONT_OPTIONS[0],
  colorScheme: COLOR_SCHEMES[0],
  effects: [],
  fontSize: 'base',
  fontWeight: 'regular',
  lineHeight: 'normal',
  letterSpacing: 'normal',
  textTransform: 'none',
  opacity: '100',
  borderRadius: 'md',
  borderWidth: 'thin',
  shadow: 'none',
  padding: 'normal',
  sectionGap: 'normal',
  elementGap: 'normal',
  contentWidth: 'standard',
  alignment: 'left',
  heroLayout: 'side-by-side',
};

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const BACKEND_TO_FRONTEND_SCHEME = {
  warm: 'amber',
  cool: 'ocean',
  dark: 'midnight',
  bright: 'mono',
  soft: 'violet',
  moon: 'midnight',
};

const FRONTEND_TO_BACKEND_SCHEME = {
  ocean: 'cool',
  violet: 'soft',
  mint: 'soft',
  amber: 'warm',
  rose: 'soft',
  mono: 'bright',
  midnight: 'dark',
  sunset: 'warm',
  forest: 'warm',
};

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(rgb, fallback = '#1a1a2e') {
  if (!rgb || typeof rgb !== 'object') return fallback;
  const clamp = (n) => Math.max(0, Math.min(255, Number(n) || 0));
  const toHex = (n) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function closestFontSizeId(px) {
  const target = Number(px) || 16;
  let best = FONT_SIZES[0];
  let bestDiff = Infinity;
  for (const opt of FONT_SIZES) {
    const val = Number.parseInt(String(opt.value).replace('px', ''), 10) || 16;
    const diff = Math.abs(val - target);
    if (diff < bestDiff) {
      best = opt;
      bestDiff = diff;
    }
  }
  return best.id;
}

function closestRadiusId(px) {
  const target = Number(px) || 8;
  let best = BORDER_RADII[0];
  let bestDiff = Infinity;
  for (const opt of BORDER_RADII) {
    const val = Number.parseInt(String(opt.value).replace('px', ''), 10) || 0;
    const diff = Math.abs(val - target);
    if (diff < bestDiff) {
      best = opt;
      bestDiff = diff;
    }
  }
  return best.id;
}

function closestByNumericOption(options, rawValue, { unit = '' } = {}) {
  const target = Number(rawValue);
  if (!Number.isFinite(target)) return options[0]?.id;
  let best = options[0];
  let bestDiff = Infinity;
  for (const opt of options) {
    const val = Number.parseFloat(String(opt.value).replace(unit, ''));
    if (!Number.isFinite(val)) continue;
    const diff = Math.abs(val - target);
    if (diff < bestDiff) {
      best = opt;
      bestDiff = diff;
    }
  }
  return best?.id || options[0]?.id;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [homeScreen, setHomeScreen] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [loadText, setLoadText] = useState('Initializing...');
  const [hudInfo, setHudInfo] = useState({ text: 'Show your hands to begin', active: false });
  const [toast, setToast] = useState({ msg: '', visible: false });
  const [status, setStatus] = useState({ cam: false, mp: false, hand: false });
  const [handLandmarks, setHandLandmarks] = useState([]);

  // Frame state
  const [frameVisible, setFrameVisible] = useState(false);
  const [frameMode, setFrameMode] = useState('hardcoded');
  const [breakpoint, setBreakpoint] = useState('desktop');
  const [framePos, setFramePos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });

  // Style state
  const [styles, setStyles] = useState({ ...DEFAULT_STYLES });
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [componentStyles, setComponentStyles] = useState({});
  const [workflowId, setWorkflowId] = useState(null);
  const [pulledFrameState, setPulledFrameState] = useState(null);
  const [pulledContent, setPulledContent] = useState(null);
  const [syncBusy, setSyncBusy] = useState({ pull: false, push: false });

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const ringArcRef = useRef(null);
  const engineRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 2200);
  }, []);

  const handleCreateFrame = useCallback(() => {
    setFrameMode('hardcoded');
    setFrameVisible(true);
  }, []);

  const handleResizeFrame = useCallback((bp) => {
    setBreakpoint(bp);
  }, []);

  const handlePullFromFigma = useCallback(async () => {
    if (syncBusy.pull) return;
    setSyncBusy((s) => ({ ...s, pull: true }));
    try {
      const resp = await fetch(`${API_BASE}/api/v1/ai/pull-from-figma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'default',
          base_card_id: 'frontend-workflow',
        }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.detail || `Pull failed (${resp.status})`);

      const fs = body?.frame_state || {};
      setWorkflowId(body.workflow_id || null);
      setPulledFrameState(fs);
      setSelectedComponent(null);
      setPulledContent({
        name: fs.name || 'Tactile',
        eyebrow: fs.eyebrow || 'Design System',
        title: fs.title || 'Give your design soul',
        subtitle: fs.subtitle || 'Design with your hands.',
        ctaText: fs.cta_text || 'Start Building with Tactile',
        metaText: fs.meta_text || 'Design meets impact',
      });
      setFrameVisible(true);
      setFrameMode('generated');

      const backendScheme = String(fs.color_scheme || 'dark').toLowerCase();
      const frontendSchemeId = BACKEND_TO_FRONTEND_SCHEME[backendScheme] || 'midnight';
      const mappedScheme = COLOR_SCHEMES.find((x) => x.id === frontendSchemeId) || COLOR_SCHEMES[0];
      const frontendScheme = {
        ...mappedScheme,
        bg: rgbToHex(fs.fill_rgb, mappedScheme.bg),
        text: rgbToHex(fs.text_rgb, mappedScheme.text),
        primary: rgbToHex(fs.accent_rgb, mappedScheme.primary),
        accent: rgbToHex(fs.text_rgb, mappedScheme.accent),
      };
      const pulledFont = String(fs.font_family || '').toLowerCase();
      const fontOpt = FONT_OPTIONS.find((f) => f.name.toLowerCase() === pulledFont)
        || FONT_OPTIONS.find((f) => pulledFont.includes(f.name.toLowerCase()))
        || FONT_OPTIONS[0];

      setStyles((prev) => ({
        ...prev,
        font: fontOpt,
        colorScheme: frontendScheme,
        fontSize: closestFontSizeId(fs.font_size),
        fontWeight: closestByNumericOption(FONT_WEIGHTS, fs.font_weight),
        lineHeight: closestByNumericOption(LINE_HEIGHTS, fs.line_height),
        letterSpacing: closestByNumericOption(LETTER_SPACINGS, Number(fs.letter_spacing_em || 0) * 100, { unit: 'em' }),
        textTransform: (
          TEXT_TRANSFORMS.find((x) => x.value === String(fs.text_transform || '').toLowerCase())?.id
          || prev.textTransform
        ),
        opacity: closestByNumericOption(OPACITY_OPTIONS, Number(fs.text_opacity || 1) * 100),
        borderRadius: closestRadiusId(fs.corner_radius),
        borderWidth: closestByNumericOption(BORDER_WIDTHS, fs.border_width, { unit: 'px' }),
        shadow: SHADOW_STYLES.find((x) => x.id === fs.shadow_style)?.id || prev.shadow,
        padding: closestByNumericOption(PADDING_OPTIONS, fs.padding, { unit: 'px' }),
        sectionGap: closestByNumericOption(GAP_OPTIONS, fs.section_gap, { unit: 'px' }),
        elementGap: closestByNumericOption(GAP_OPTIONS, fs.element_gap, { unit: 'px' }),
        effects: fs.liquid_glass ? ['liquid-glass'] : [],
      }));

      showToast('Pulled context from Figma');
    } catch (err) {
      showToast(`Pull failed: ${String(err?.message || err)}`);
    } finally {
      setSyncBusy((s) => ({ ...s, pull: false }));
    }
  }, [showToast, syncBusy.pull]);

  const handlePushToFigma = useCallback(async () => {
    if (syncBusy.push) return;
    if (!workflowId) {
      showToast('Pull from Figma first');
      return;
    }
    setSyncBusy((s) => ({ ...s, push: true }));
    try {
      const bp = BREAKPOINTS[breakpoint] || BREAKPOINTS.desktop;
      const cs = styles.colorScheme || COLOR_SCHEMES[0];
      const backendScheme = FRONTEND_TO_BACKEND_SCHEME[cs.id] || 'dark';
      const sizeOpt = FONT_SIZES.find((o) => o.id === styles.fontSize) || FONT_SIZES[2];
      const weightOpt = FONT_WEIGHTS.find((o) => o.id === styles.fontWeight) || FONT_WEIGHTS[1];
      const lineHeightOpt = LINE_HEIGHTS.find((o) => o.id === styles.lineHeight) || LINE_HEIGHTS[2];
      const letterSpacingOpt = LETTER_SPACINGS.find((o) => o.id === styles.letterSpacing) || LETTER_SPACINGS[2];
      const textTransformOpt = TEXT_TRANSFORMS.find((o) => o.id === styles.textTransform) || TEXT_TRANSFORMS[0];
      const opacityOpt = OPACITY_OPTIONS.find((o) => o.id === styles.opacity) || OPACITY_OPTIONS[0];
      const radiusOpt = BORDER_RADII.find((o) => o.id === styles.borderRadius) || BORDER_RADII[2];
      const borderWidthOpt = BORDER_WIDTHS.find((o) => o.id === styles.borderWidth) || BORDER_WIDTHS[1];
      const shadowOpt = SHADOW_STYLES.find((o) => o.id === styles.shadow) || SHADOW_STYLES[0];
      const paddingOpt = PADDING_OPTIONS.find((o) => o.id === styles.padding) || PADDING_OPTIONS[2];
      const sectionGapOpt = GAP_OPTIONS.find((o) => o.id === styles.sectionGap) || GAP_OPTIONS[2];
      const elementGapOpt = GAP_OPTIONS.find((o) => o.id === styles.elementGap) || GAP_OPTIONS[2];

      const finalFrameState = {
        ...(pulledFrameState || {}),
        width: bp.width,
        height: Math.max(
          120,
          Math.round(
            (bp.width / Math.max(1, Number(pulledFrameState?.width) || 420))
            * (Number(pulledFrameState?.height) || 240),
          ),
        ),
        color_scheme: backendScheme,
        fill_rgb: hexToRgb(cs.bg) || pulledFrameState?.fill_rgb,
        text_rgb: hexToRgb(cs.text) || pulledFrameState?.text_rgb,
        accent_rgb: hexToRgb(cs.primary) || pulledFrameState?.accent_rgb,
        font_family: styles.font?.name || pulledFrameState?.font_family || 'Inter',
        font_size: Number.parseInt(String(sizeOpt.value).replace('px', ''), 10) || 16,
        font_weight: Number(weightOpt.value) || 400,
        line_height: Number(lineHeightOpt.value) || 1.5,
        letter_spacing_em: Number.parseFloat(String(letterSpacingOpt.value).replace('em', '')) || 0,
        text_transform: String(textTransformOpt.value || 'none'),
        text_opacity: Number(opacityOpt.value) || 1,
        corner_radius: Number.parseInt(String(radiusOpt.value).replace('px', ''), 10) || 8,
        border_width: Number.parseInt(String(borderWidthOpt.value).replace('px', ''), 10) || 0,
        shadow_style: String(shadowOpt.id || 'none'),
        padding: Number.parseInt(String(paddingOpt.value).replace('px', ''), 10) || 24,
        section_gap: Number.parseInt(String(sectionGapOpt.value).replace('px', ''), 10) || 16,
        element_gap: Number.parseInt(String(elementGapOpt.value).replace('px', ''), 10) || 16,
        liquid_glass: (styles.effects || []).includes('liquid-glass'),
      };

      const resp = await fetch(`${API_BASE}/api/v1/ai/push-to-figma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'default',
          workflow_id: workflowId,
          final_frame_state: finalFrameState,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.detail || `Push failed (${resp.status})`);
      showToast('Pushed derived frame to Figma');
    } catch (err) {
      showToast(`Push failed: ${String(err?.message || err)}`);
    } finally {
      setSyncBusy((s) => ({ ...s, push: false }));
    }
  }, [breakpoint, pulledFrameState, showToast, styles, syncBusy.push, workflowId]);

  const handleDeleteFrame = useCallback(() => {
    setFrameVisible(false);
    setFrameMode('hardcoded');
    setSelectedComponent(null);
    setComponentStyles({});
    setFramePos(null);
    setEditorOpen(false);
    setWorkflowId(null);
    setPulledFrameState(null);
    setPulledContent(null);
  }, []);

  const handleToggleStyleEditor = useCallback((forceClose) => {
    if (forceClose === true) {
      setEditorOpen(false);
    } else {
      setEditorOpen((v) => !v);
    }
  }, []);

  const handleStyleChange = useCallback((key, value) => {
    if (frameMode !== 'generated' && selectedComponent) {
      setComponentStyles((prev) => ({
        ...prev,
        [selectedComponent]: { ...(prev[selectedComponent] || {}), [key]: value },
      }));
    } else {
      setStyles((prev) => ({ ...prev, [key]: value }));
    }
  }, [frameMode, selectedComponent]);

  const handleCursorMove = useCallback((x, y) => {
    const els = document.querySelectorAll('[data-selectable]');
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const hit = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      el.classList.toggle('cursor-hover', hit);
    });
  }, []);

  const handleCursorClick = useCallback((x, y) => {
    const el = document.elementFromPoint(x, y);
    if (el) el.click();
  }, []);

  const handleScrollDelta = useCallback((dy) => {
    const scrollable = document.querySelector('.se-body') || document.querySelector('.se-tab-content');
    if (scrollable) scrollable.scrollTop += dy;
  }, []);

  const handleDragStart = useCallback((x, y) => {
    setDragging(true);
    setFramePos((prev) => {
      const cur = prev || { x: 0, y: 0 };
      dragRef.current = { startX: x, startY: y, origX: cur.x, origY: cur.y };
      return cur;
    });
  }, []);

  const handleDragMove = useCallback((x, y) => {
    const d = dragRef.current;
    const stage = document.querySelector('#frame-stage')?.getBoundingClientRect();
    const stageW = stage?.width ?? window.innerWidth;
    const stageH = stage?.height ?? window.innerHeight - 100;
    const margin = 60;
    const maxX = Math.max(0, (stageW / 2) - margin);
    const maxY = Math.max(0, (stageH / 2) - margin);
    const rawX = d.origX + (x - d.startX);
    const rawY = d.origY + (y - d.startY);
    setFramePos({
      x: Math.max(-maxX, Math.min(maxX, rawX)),
      y: Math.max(-maxY, Math.min(maxY, rawY)),
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    const engine = createEngine(
      {
        video: videoRef.current,
        canvas: canvasRef.current,
        cursor: cursorRef.current,
        ring: ringRef.current,
        ringArc: ringArcRef.current,
      },
      {
        onHudChange: setHudInfo,
        onStatusChange: setStatus,
        onToast: showToast,
        onLoadProgress: (pct, text) => { setLoadPct(pct); setLoadText(text); },
        onReady: () => setLoading(false),
        onHandLandmarks: setHandLandmarks,
        onDismissHome: () => setHomeScreen(false),
        onCreateFrame: handleCreateFrame,
        onResizeFrame: handleResizeFrame,
        onToggleStyleEditor: handleToggleStyleEditor,
        onCursorMove: handleCursorMove,
        onCursorClick: handleCursorClick,
        onScrollDelta: handleScrollDelta,
        onDragStart: handleDragStart,
        onDragMove: handleDragMove,
        onDragEnd: handleDragEnd,
        onDeleteFrame: handleDeleteFrame,
      },
    );
    engineRef.current = engine;
    engine.init();
    return () => engine.destroy();
  }, [showToast, handleCreateFrame, handleResizeFrame, handleDeleteFrame,
      handleToggleStyleEditor,
      handleCursorMove, handleCursorClick, handleScrollDelta,
      handleDragStart, handleDragMove, handleDragEnd]);

  return (
    <>
      <AsciiCloudHome visible={homeScreen} loading={loading} handLandmarks={handLandmarks} />
      <LoadingScreen pct={loadPct} text={loadText} visible={loading} />

      <video ref={videoRef} id="video" autoPlay playsInline muted style={{ opacity: homeScreen ? 0 : 0.25 }} />
      <canvas ref={canvasRef} id="hand-canvas" />

      {/* Style Editor — left panel */}
      <StyleEditor
        visible={editorOpen && !homeScreen}
        styles={selectedComponent ? { ...styles, ...(componentStyles[selectedComponent] || {}) } : styles}
        selectedComponent={selectedComponent}
        onStyleChange={handleStyleChange}
        onClose={() => setEditorOpen(false)}
      />

      {/* Design Frame */}
      {!homeScreen && frameVisible && (
        <div id="frame-stage" className={editorOpen ? 'shifted' : ''}>
          {frameMode === 'generated' ? (
            <GeneratedFrame
              breakpoint={breakpoint}
              styles={styles}
              frameState={pulledFrameState}
              pulledContent={pulledContent}
              framePos={framePos}
              dragging={dragging}
            />
          ) : (
            <DesignFrame
              breakpoint={breakpoint}
              styles={styles}
              componentStyles={componentStyles}
              pulledContent={pulledContent}
              selectedComponent={selectedComponent}
              onSelectComponent={setSelectedComponent}
              framePos={framePos}
              dragging={dragging}
            />
          )}
        </div>
      )}

      {/* Hold Ring */}
      <div ref={ringRef} className="hold-ring" id="ring-r">
        <svg width="64" height="64">
          <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(240,240,236,0.07)" strokeWidth="1.5" />
          <circle
            ref={ringArcRef}
            cx="32" cy="32" r="27"
            fill="none"
            stroke="rgba(240,240,236,0.9)"
            strokeWidth="1.5"
            strokeDasharray="169.6"
            strokeDashoffset="169.6"
          />
        </svg>
      </div>

      {/* Hand Cursor */}
      <div ref={cursorRef} className="hand-cursor" id="cursor-r" />

      <Toast msg={toast.msg} visible={toast.visible} />

      {!homeScreen && (
        <>
          <TopBar
            hudInfo={hudInfo}
            breakpoint={breakpoint}
            frameVisible={frameVisible}
            workflowId={workflowId}
            pullBusy={syncBusy.pull}
            pushBusy={syncBusy.push}
            onPullFromFigma={handlePullFromFigma}
            onPushToFigma={handlePushToFigma}
          />
          <StatusBar status={status} breakpoint={breakpoint} frameVisible={frameVisible} />
          <Legend />
        </>
      )}
    </>
  );
}
