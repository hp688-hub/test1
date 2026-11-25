// tslint:disable
/* eslint-disable */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  BadgeDefinition,
  BIA_TIEN_SI_BADGE,
  COLLECTION_BADGES,
  DialogueLine,
  getConfig,
  HINT_CONFIRM_PROMPT,
  HINT_EXHAUSTED_MSG,
  INITIAL_KNOWLEDGE_CANDLES,
  MAX_HINTS_PER_SCENE,
  QUIZ_FAIL_MSG,
  QUIZ_QUESTION_BANK,
  QUIZ_WIN_MSG,
  QuizQuestion,
  SAVE_STORAGE_KEY,
  SCENE_1_CHOICE_LABEL,
  SCENE_1_SCRIPT,
  SCENE_2_BACK_LABEL,
  SCENE_2_DO_PAPER_LINE,
  SCENE_2_INSPECTIONS,
  SCENE_2_POCKET_BUTTON_LABEL,
  SCENE_2_READ_PAPER_LABEL,
  SCENE_2_SHUDDER_LINE,
  SCENE_3_CLAIM_REWARD_LABEL,
  SCENE_3_CONFIRM_LABEL,
  SCENE_3_CORRECT_PASSCODE,
  SCENE_3_DIALOGUE_SCRIPT,
  SCENE_3_EXPLANATION_BODY,
  SCENE_3_EXPLANATION_TITLE,
  SCENE_3_POEM_LINES,
  SCENE_3_PUT_AWAY_LABEL,
  SCENE_3_PUZZLE_PROMPT,
  SCENE_3_REOPEN_PAPER_LABEL,
  SCENE_3_WRONG_PASSCODE_MSG,
  SCENE_BACKGROUND_REGISTRY,
  SCENE_HINTS_BY_SCENE,
  Scene2ChoiceId,
  START_SCREEN_SUBTITLE,
  THEME,
} from './constants';
import BackgroundMusic from './utils/BackgroundMusic';
import {
  clamp,
  createFixedStepper,
  drawAsset,
  drawBackground,
  gameAudio,
  GameState,
  MenuOverlay,
  Overlay,
  prepareCanvas,
  useAssets,
  useInput,
  useIsMobile,
  useOverlayFocusNavigation,
} from './utils/helper';

/**
 * Extensible Asset Manifest Builder.
 * Binds Scene 1, Scene 2 (`nencanh2`), and Scene 3+ assets (`giaydo_baive`,
 * `icon_goiy`, `icon_bosuutap`, `nen_popup`, `huyhieu_biatiensi`) while
 * supporting `window.CUSTOM_ASSETS` overrides.
 */
function buildAssetsManifest(): Record<string, string> {
  const custom =
    typeof window !== 'undefined' && window.CUSTOM_ASSETS
      ? window.CUSTOM_ASSETS
      : {};

  const manifest: Record<string, string> = {
    menu_background:
      custom.menu_background ||
      custom.Menu_Background ||
      'assets/images/menu_background.png',
    menu_button_sprite:
      custom.menu_button_sprite ||
      custom.Menu_Button_Sprite ||
      'assets/images/menu_button_sprite.png',
    sprite_lien_hoodie:
      custom.sprite_lien_hoodie ||
      custom.Sprite_Lien_Hoodie ||
      'assets/images/sprite_lien_hoodie.png',
    sprite_quan_gia_lam:
      custom.sprite_quan_gia_lam ||
      custom.Sprite_QuanGiaLam ||
      'assets/images/sprite_quan_gia_lam.png',
    dialogue_box_frame:
      custom.dialogue_box_frame ||
      custom.Dialogue_Box_Frame ||
      'assets/images/dialogue_box_frame.png',
    giaydo_baive:
      custom.giaydo_baive ||
      custom.GiayDo_BaiVe ||
      'assets/images/giaydo_baive.png',
    icon_goiy:
      custom.icon_goiy || custom.Icon_GoiY || 'assets/images/icon_goiy.png',
    icon_bosuutap:
      custom.icon_bosuutap ||
      custom.Icon_BoSuuTap ||
      'assets/images/icon_bosuutap.png',
    nen_popup:
      custom.nen_popup || custom.Nen_Popup || 'assets/images/nen_popup.png',
    huyhieu_biatiensi:
      custom.huyhieu_biatiensi ||
      custom.HuyHieu_BiaTienSi ||
      'assets/images/huyhieu_biatiensi.png',
  };

  for (const slot of Object.values(SCENE_BACKGROUND_REGISTRY)) {
    const customOverride = custom[slot.key] || custom[slot.alias];
    if (slot.preloadByDefault || customOverride) {
      manifest[slot.key] = customOverride || slot.defaultPath;
    }
  }

  return manifest;
}

/**
 * Draws 2 distinct random quiz questions using weighted random sampling without replacement.
 * Q1–Q9 (Short Answer & True/False) hold 90% of the total weight pool while Q10 remains eligible.
 */
function pickTwoWeightedQuizQuestions(): QuizQuestion[] {
  const pool = [...QUIZ_QUESTION_BANK];
  const picked: QuizQuestion[] = [];

  for (let drawIdx = 0; drawIdx < 2 && pool.length > 0; drawIdx++) {
    const totalWeight = pool.reduce((sum, q) => sum + q.weight, 0);
    let r = Math.random() * totalWeight;
    let chosenIdx = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i]?.weight ?? 1;
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const [chosen] = pool.splice(chosenIdx, 1);
    if (chosen) picked.push(chosen);
  }

  return picked;
}

const ASSETS_MANIFEST: Record<string, string> = buildAssetsManifest();
const LEGACY_STORAGE_KEY = 'hlplk_standalone_state';

type ActiveSceneNumber = 1 | 2 | 3 | 4;

type Scene2Phase =
  | 'STEP1_MENU'
  | 'STEP1_INSPECT'
  | 'STEP2_SHUDDER'
  | 'STEP2_PAPER';

type Scene3Phase = 'dialogue' | 'puzzle' | 'explanation' | 'reward';

type HintOverlayView = 'MAIN' | 'CONFIRM';
type QuizRoundStatus = 'ANSWERING' | 'WON' | 'FAILED';

interface SavedGameProgress {
  version: 2;
  activeScene: ActiveSceneNumber;
  scene1LineIndex: number;
  scene1ChoiceVisible: boolean;
  scene2Phase: Scene2Phase;
  checkedChoices: Scene2ChoiceId[];
  activeInspectionId: Scene2ChoiceId | null;
  scene3Phase: Scene3Phase;
  scene3DialogueIndex: number;
  paperHidden: boolean;
  hudUnlocked: boolean;
  candles: number;
  hintsUsedByScene: Record<number, number>;
  unlockedBadges: string[];
}

function readSavedProgress(): SavedGameProgress | null {
  try {
    const raw = window.localStorage?.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGameProgress>;
    if (!parsed || parsed.version !== 2) return null;
    const sc = parsed.activeScene;
    if (sc !== 1 && sc !== 2 && sc !== 3 && sc !== 4) return null;

    const validChecked = Array.isArray(parsed.checkedChoices)
      ? parsed.checkedChoices.filter(
          (c): c is Scene2ChoiceId => c === 'A' || c === 'B' || c === 'C',
        )
      : [];

    const validS2Phase: Scene2Phase =
      parsed.scene2Phase === 'STEP1_INSPECT' ||
      parsed.scene2Phase === 'STEP2_SHUDDER' ||
      parsed.scene2Phase === 'STEP2_PAPER'
        ? parsed.scene2Phase
        : 'STEP1_MENU';

    const validInspectId: Scene2ChoiceId | null =
      parsed.activeInspectionId === 'A' ||
      parsed.activeInspectionId === 'B' ||
      parsed.activeInspectionId === 'C'
        ? parsed.activeInspectionId
        : null;

    const validS3Phase: Scene3Phase =
      parsed.scene3Phase === 'puzzle' ||
      parsed.scene3Phase === 'explanation' ||
      parsed.scene3Phase === 'reward'
        ? parsed.scene3Phase
        : 'dialogue';

    const rawHints =
      parsed.hintsUsedByScene && typeof parsed.hintsUsedByScene === 'object'
        ? parsed.hintsUsedByScene
        : {};
    const cleanHints: Record<number, number> = {};
    for (const [k, v] of Object.entries(rawHints)) {
      const nk = Number(k);
      if (Number.isFinite(nk) && typeof v === 'number') {
        cleanHints[nk] = clamp(Math.floor(v), 0, MAX_HINTS_PER_SCENE);
      }
    }

    return {
      version: 2,
      activeScene: sc,
      scene1LineIndex: clamp(
        typeof parsed.scene1LineIndex === 'number'
          ? Math.floor(parsed.scene1LineIndex)
          : 0,
        0,
        SCENE_1_SCRIPT.length - 1,
      ),
      scene1ChoiceVisible: Boolean(parsed.scene1ChoiceVisible),
      scene2Phase: validS2Phase,
      checkedChoices: validChecked,
      activeInspectionId: validInspectId,
      scene3Phase: validS3Phase,
      scene3DialogueIndex: clamp(
        typeof parsed.scene3DialogueIndex === 'number'
          ? Math.floor(parsed.scene3DialogueIndex)
          : 0,
        0,
        SCENE_3_DIALOGUE_SCRIPT.length - 1,
      ),
      paperHidden: Boolean(parsed.paperHidden),
      hudUnlocked: Boolean(parsed.hudUnlocked || sc >= 3),
      candles:
        typeof parsed.candles === 'number' && Number.isFinite(parsed.candles)
          ? Math.max(0, Math.floor(parsed.candles))
          : INITIAL_KNOWLEDGE_CANDLES,
      hintsUsedByScene: cleanHints,
      unlockedBadges: Array.isArray(parsed.unlockedBadges)
        ? parsed.unlockedBadges.filter((b): b is string => typeof b === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

function writeSavedProgress(snapshot: SavedGameProgress): void {
  try {
    window.localStorage?.setItem(SAVE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore restricted localStorage environments
  }
}

function clearSavedProgress(): void {
  try {
    window.localStorage?.removeItem(SAVE_STORAGE_KEY);
    window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore restricted localStorage environments
  }
}

interface CustomWindow extends Window {
  canHandleBackKey?: boolean;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

interface SceneRenderState {
  lienAlpha: number;
  lienBrightness: number;
  lienOffsetY: number;
  quanGiaAlpha: number;
  quanGiaBrightness: number;
  quanGiaOffsetY: number;
  shakeTimer: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  elapsedTime: number;
  dust: DustParticle[];
}

interface TouchSafeButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * Reusable interactive button enforcing full pointer lifecycle handlers
 * (onPointerDown, onPointerUp, onPointerLeave, onPointerCancel) + touch-none
 * and pointer-events-auto directly on the <button> element.
 */
function TouchSafeButton({
  onClick,
  children,
  className = '',
  style,
  autoFocus,
  disabled = false,
  testId,
  ariaLabel,
  buttonRef,
}: TouchSafeButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      autoFocus={autoFocus}
      data-testid={testId}
      aria-label={ariaLabel}
      onMouseEnter={() => {
        if (!disabled) gameAudio.playHoverMicroTone();
      }}
      onPointerDown={() => {
        if (!disabled) setPressed(true);
      }}
      onPointerUp={() => {
        setPressed(false);
      }}
      onPointerLeave={() => {
        setPressed(false);
      }}
      onPointerCancel={() => {
        setPressed(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPressed(false);
        if (!disabled) onClick();
      }}
      style={style}
      className={`touch-none pointer-events-auto select-none min-w-[48px] min-h-[48px] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : pressed
            ? 'scale-[0.97] brightness-95'
            : 'hover:scale-[1.02] hover:brightness-110'
      } ${className}`}>
      {children}
    </button>
  );
}

/**
 * Historical Badge Card styled with rich red-gold-brown borders (#8B1E1E, #D4AF37, #4A2511).
 * Shared between the Collection Overlay and the Scene 3 Celebratory Reward Popup.
 */
function HistoricalBadgeCard({
  badge,
  imgLoaded,
  imgSrc,
  onClick,
  compact = false,
}: {
  badge: BadgeDefinition;
  imgLoaded: boolean;
  imgSrc: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <TouchSafeButton
      onClick={onClick}
      testId={`badge-card-${badge.id}`}
      ariaLabel={`Xem chi tiết huy hiệu ${badge.title}`}
      style={{
        background: `linear-gradient(180deg, ${THEME.colors.badgeRed} 0%, ${THEME.colors.badgeBrown} 100%)`,
        borderColor: THEME.colors.badgeGold,
        boxShadow: `0 0 0 3px ${THEME.colors.badgeBrown}, 0 12px 28px rgba(0, 0, 0, 0.85), inset 0 0 14px rgba(212, 175, 55, 0.28)`,
      }}
      className={`flex flex-col items-center justify-between rounded-xl border-2 p-2.5 sm:p-3 text-center ${
        compact ? 'w-[152px] sm:w-[176px]' : 'w-[164px] sm:w-[192px]'
      }`}>
      <div
        style={{
          backgroundColor: 'rgba(26, 12, 7, 0.72)',
          borderColor: 'rgba(212, 175, 55, 0.55)',
          aspectRatio: `${getConfig('assetHuyHieuBiaTienSiAspectRatio')}`,
        }}
        className="w-full rounded-lg border p-2 flex items-center justify-center overflow-hidden mb-2">
        {imgLoaded ? (
          <img
            src={imgSrc}
            alt={badge.title}
            className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
          />
        ) : (
          <svg
            viewBox="0 0 120 170"
            className="w-full h-full object-contain"
            aria-hidden="true">
            <rect
              x="30"
              y="18"
              width="60"
              height="96"
              rx="24"
              fill="#7c9099"
              stroke="#45565e"
              strokeWidth="4"
            />
            <rect
              x="38"
              y="40"
              width="44"
              height="66"
              fill="#95a7b0"
              stroke="#52656e"
              strokeWidth="2.5"
            />
            <ellipse
              cx="62"
              cy="132"
              rx="38"
              ry="20"
              fill="#647982"
              stroke="#3b4b52"
              strokeWidth="3.5"
            />
            <circle
              cx="22"
              cy="126"
              r="11"
              fill="#738891"
              stroke="#3b4b52"
              strokeWidth="3"
            />
          </svg>
        )}
      </div>

      <span
        style={{
          fontFamily: THEME.fonts.heading,
          color: '#FFF6D6',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.95)',
        }}
        className="text-xs sm:text-sm font-bold leading-snug px-1">
        {badge.title}
      </span>
    </TouchSafeButton>
  );
}

/**
 * Crisp Dó Paper (`giaydo_baive`) with solid pure `#000000` 10-line poem (zero glow/blur).
 */
function forcePureBlackPoemStyle(el: HTMLElement | null) {
  if (!el) return;
  el.style.setProperty('color', '#000000', 'important');
  el.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
  el.style.setProperty('text-shadow', 'none', 'important');
  el.style.setProperty('filter', 'none', 'important');
  el.style.setProperty('-webkit-filter', 'none', 'important');
  el.style.setProperty('mix-blend-mode', 'normal', 'important');
  el.style.setProperty('opacity', '1', 'important');
}

function DoPaperPoemCard({
  giayDoLoaded,
  imgSrc,
  compactForDialogue = false,
}: {
  giayDoLoaded: boolean;
  imgSrc: string;
  compactForDialogue?: boolean;
}) {
  return (
    <div
      style={{
        aspectRatio: `${getConfig('assetGiayDoAspectRatio')}`,
        width: compactForDialogue
          ? undefined
          : 'clamp(180px, min(90vw, calc((100vh - 152px) * 0.73)), 560px)',
        height: compactForDialogue ? '100%' : undefined,
      }}
      className="relative flex items-center justify-center select-none shrink-0">
      {giayDoLoaded ? (
        <img
          src={imgSrc}
          alt="Mảnh giấy dó cổ"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_18px_36px_rgba(0,0,0,0.9)]"
        />
      ) : (
        <div
          style={{
            background:
              'linear-gradient(135deg, #ebd6ad 0%, #dfc18d 48%, #d2ae74 100%)',
            boxShadow:
              '0 18px 36px rgba(0,0,0,0.9), inset 0 0 28px rgba(112, 74, 28, 0.38)',
          }}
          className="absolute inset-0 rounded-sm border-2 border-amber-900/50 pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-amber-950/20" />
          <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-amber-950/20" />
        </div>
      )}

      {/* Exact 10-line Poem forced strictly to pure solid black (#000000) with zero shadow/glow */}
      <div
        ref={forcePureBlackPoemStyle}
        style={{
          fontFamily: THEME.fonts.heading,
          color: '#000000',
          WebkitTextFillColor: '#000000',
          textShadow: 'none',
          filter: 'none',
          mixBlendMode: 'normal',
        }}
        className={`vn-poem-container ${
          compactForDialogue ? 'is-phase1-compact' : ''
        } absolute inset-0 z-10 w-full h-full px-[2.8%] py-[4.5%] flex flex-col items-center justify-center text-center overflow-hidden`}>
        {SCENE_3_POEM_LINES.map((poemLine, idx) => (
          <p
            key={idx}
            ref={forcePureBlackPoemStyle}
            style={{
              color: '#000000',
              WebkitTextFillColor: '#000000',
              textShadow: 'none',
              filter: 'none',
              mixBlendMode: 'normal',
            }}
            className="vn-poem-line font-bold italic whitespace-nowrap m-0">
            {poemLine}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Rich procedural fallback renderer for `nencanh2` (Scene 2 & Scene 3 Background)
 * so offline mode continues working seamlessly if `nencanh2.png` is unavailable.
 */
function drawProceduralScene2Background(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
) {
  const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
  wallGrad.addColorStop(0, '#1b1510');
  wallGrad.addColorStop(0.58, '#2b2118');
  wallGrad.addColorStop(1, '#19130e');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#140f0b';
  ctx.fillRect(0, 0, w, h * 0.08);
  ctx.fillRect(w * 0.44, 0, 26, h * 0.68);
  ctx.fillRect(w * 0.86, 0, 28, h * 0.7);

  const doorX = w * 0.58;
  const doorY = h * 0.16;
  const doorW = w * 0.21;
  const doorH = h * 0.54;

  const mistGrad = ctx.createLinearGradient(
    doorX + doorW * 0.48,
    doorY,
    doorX + doorW,
    doorY + doorH,
  );
  mistGrad.addColorStop(0, '#8ba3a8');
  mistGrad.addColorStop(0.55, '#5a7276');
  mistGrad.addColorStop(1, '#3d4d47');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(doorX, doorY, doorW, doorH);

  ctx.fillStyle = 'rgba(42, 54, 52, 0.72)';
  ctx.beginPath();
  ctx.moveTo(doorX + doorW * 0.52, doorY + doorH * 0.28);
  ctx.quadraticCurveTo(
    doorX + doorW * 0.78,
    doorY + doorH * 0.18,
    doorX + doorW,
    doorY + doorH * 0.22,
  );
  ctx.lineTo(doorX + doorW, doorY + doorH * 0.34);
  ctx.lineTo(doorX + doorW * 0.52, doorY + doorH * 0.34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2d2016';
  ctx.fillRect(doorX - 10, doorY - 12, doorW + 20, 14);
  ctx.fillRect(doorX, doorY, doorW * 0.52, doorH);
  ctx.fillStyle = '#6f878d';
  for (let s = 0; s < 5; s++) {
    const sx = doorX + 12 + s * ((doorW * 0.44) / 5);
    ctx.fillRect(sx, doorY + 18, 6, doorH * 0.36);
    ctx.fillRect(sx, doorY + doorH * 0.56, 6, doorH * 0.34);
  }

  ctx.fillStyle = '#241b14';
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  ctx.fillStyle = '#4e3c24';
  ctx.beginPath();
  ctx.ellipse(
    w * 0.34,
    h * 0.58,
    Math.max(10, w * 0.12),
    Math.max(10, h * 0.08),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = '#3c2a1b';
  ctx.fillRect(w * 0.8, h * 0.58, w * 0.16, h * 0.14);

  const jars = [
    {cx: w * 0.1, cy: h * 0.66, rx: 68, ry: 98},
    {cx: w * 0.39, cy: h * 0.66, rx: 56, ry: 78},
    {cx: w * 0.505, cy: h * 0.62, rx: 64, ry: 92},
  ];
  for (const jar of jars) {
    ctx.fillStyle = '#4a2e1b';
    ctx.beginPath();
    ctx.ellipse(
      jar.cx,
      jar.cy,
      Math.max(8, jar.rx),
      Math.max(8, jar.ry),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  const lampX = w * 0.512;
  const lampY = h * 0.495;
  const flicker = 1 + Math.sin(elapsed * 9.5) * 0.08;
  const glowRadius = Math.max(12, 135 * flicker);
  const lampGlow = ctx.createRadialGradient(
    lampX,
    lampY,
    4,
    lampX,
    lampY,
    glowRadius,
  );
  lampGlow.addColorStop(0, 'rgba(255, 224, 140, 0.92)');
  lampGlow.addColorStop(0.35, 'rgba(245, 158, 56, 0.38)');
  lampGlow.addColorStop(1, 'rgba(245, 158, 56, 0)');
  ctx.fillStyle = lampGlow;
  ctx.beginPath();
  ctx.arc(lampX, lampY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d1c12';
  ctx.beginPath();
  ctx.ellipse(lampX, lampY + 12, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd56b';
  ctx.beginPath();
  ctx.ellipse(
    lampX,
    lampY,
    Math.max(3, 5 * flicker),
    Math.max(6, 11 * flicker),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startScreenRef = useRef<HTMLDivElement>(null);
  const step1MenuRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const bottomActionBtnRef = useRef<HTMLButtonElement>(null);
  const passcodeInputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);
  const stepperRef = useRef<ReturnType<typeof createFixedStepper>>();

  // --- GLOBAL PAUSE / CANCEL EDGE STATE ---
  const lastCancelRef = useRef(false);
  const lastConfirmRef = useRef(false);
  const staffKnockTimeoutRef = useRef<number | null>(null);
  const sceneShakeTimeoutRef = useRef<number | null>(null);
  const passcodeShakeTimeoutRef = useRef<number | null>(null);

  // --- MOBILE DETECTION ---
  const isMobile = useIsMobile();

  // --- ASSETS ---
  const {assets, isReady: assetsReady} = useAssets(ASSETS_MANIFEST);

  const canvasWidth = getConfig('baseCanvasWidth');
  const canvasHeight = getConfig('baseCanvasHeight');

  if (!stepperRef.current) {
    const stepMs = getConfig('stepMs');
    const maxSubSteps = getConfig('maxSubSteps');
    stepperRef.current = createFixedStepper(stepMs, maxSubSteps);
  }

  // --- AUDIO & OVERLAY UI STATES ---
  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    try {
      return window.localStorage?.getItem('hlplk_music_muted') === '1';
    } catch {
      return false;
    }
  });
  const [isSfxMuted, setIsSfxMuted] = useState(() => {
    try {
      const muted = window.localStorage?.getItem('hlplk_sfx_muted') === '1';
      gameAudio.setMuted(muted);
      return muted;
    } catch {
      return gameAudio.getMuteState();
    }
  });
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  // --- SCENE & VISUAL NOVEL DIALOGUE STATES ---
  const [activeScene, setActiveScene] = useState<ActiveSceneNumber>(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [revealedChars, setRevealedChars] = useState(0);
  const [isLineComplete, setIsLineComplete] = useState(false);
  const [isChoiceVisible, setIsChoiceVisible] = useState(false);

  // Scene 2 specific states
  const [scene2Phase, setScene2Phase] = useState<Scene2Phase>('STEP1_MENU');
  const [checkedChoices, setCheckedChoices] = useState<Scene2ChoiceId[]>([]);
  const [activeInspectionId, setActiveInspectionId] =
    useState<Scene2ChoiceId | null>(null);
  const [isSceneShaking, setIsSceneShaking] = useState(false);

  // Scene 3 specific states ('dialogue' -> 'puzzle' -> 'explanation' -> 'reward')
  const [scene3Phase, setScene3Phase] = useState<Scene3Phase>('dialogue');
  const [scene3DialogueIndex, setScene3DialogueIndex] = useState(0);
  const [hudUnlocked, setHudUnlocked] = useState(false);
  const [isDoPaperOpen, setIsDoPaperOpen] = useState(true);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isPasscodeShaking, setIsPasscodeShaking] = useState(false);
  const [isRewardPopupOpen, setIsRewardPopupOpen] = useState(false);

  // Knowledge Candle Hint & Quiz System states
  const [candleCount, setCandleCount] = useState<number>(
    INITIAL_KNOWLEDGE_CANDLES,
  );
  const [hintsUsedByScene, setHintsUsedByScene] = useState<
    Record<number, number>
  >({});
  const [isHintOverlayOpen, setIsHintOverlayOpen] = useState(false);
  const [hintOverlayView, setHintOverlayView] =
    useState<HintOverlayView>('MAIN');
  const [activeHintModalText, setActiveHintModalText] = useState<
    string | null
  >(null);

  // Quiz Mini-Game states
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizStepIndex, setQuizStepIndex] = useState(0);
  const [quizAnswerInput, setQuizAnswerInput] = useState('');
  const [quizRoundStatus, setQuizRoundStatus] =
    useState<QuizRoundStatus>('ANSWERING');

  // Historical Badge Collection states
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [isCollectionOverlayOpen, setIsCollectionOverlayOpen] = useState(false);
  const [activeBadgeDetail, setActiveBadgeDetail] =
    useState<BadgeDefinition | null>(null);

  const [dialogueShakeOffset, setDialogueShakeOffset] = useState<{
    x: number;
    y: number;
  }>({x: 0, y: 0});

  const activeSceneRef = useRef<ActiveSceneNumber>(1);
  activeSceneRef.current = activeScene;

  const scene2PhaseRef = useRef<Scene2Phase>('STEP1_MENU');
  scene2PhaseRef.current = scene2Phase;

  const scene3PhaseRef = useRef<Scene3Phase>('dialogue');
  scene3PhaseRef.current = scene3Phase;

  const scene3DialogueIndexRef = useRef<number>(0);
  scene3DialogueIndexRef.current = scene3DialogueIndex;

  const checkedChoicesRef = useRef<Scene2ChoiceId[]>([]);
  checkedChoicesRef.current = checkedChoices;

  const activeInspectionIdRef = useRef<Scene2ChoiceId | null>(null);
  activeInspectionIdRef.current = activeInspectionId;

  const activeDialogueLineRef = useRef<DialogueLine>(SCENE_1_SCRIPT[0]);
  const currentLineIndexRef = useRef(0);
  const revealedFloatRef = useRef(0);
  const lastRevealedIntRef = useRef(0);
  const isLineCompleteRef = useRef(false);
  const isChoiceVisibleRef = useRef(false);

  const isExplanationModalOpen =
    activeScene === 3 && scene3Phase === 'explanation';

  const hasAnyModalOpen =
    isGameMenuOpen ||
    isHowToPlayOpen ||
    isExplanationModalOpen ||
    isRewardPopupOpen ||
    isHintOverlayOpen ||
    isCollectionOverlayOpen ||
    activeHintModalText !== null ||
    isQuizModalOpen ||
    activeBadgeDetail !== null;

  const isPausedOverlayRef = useRef(false);
  isPausedOverlayRef.current = hasAnyModalOpen;

  const createInitialDust = useCallback((): DustParticle[] => {
    const count = getConfig('ambientDustCount');
    const list: DustParticle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight * 0.78,
        vx: (Math.random() - 0.35) * 14,
        vy: -4 - Math.random() * 10,
        radius: 1.2 + Math.random() * 2.2,
        alpha: 0.12 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return list;
  }, [canvasWidth, canvasHeight]);

  const sceneRenderRef = useRef<SceneRenderState>({
    lienAlpha: 1,
    lienBrightness: 1,
    lienOffsetY: 16,
    quanGiaAlpha: 0,
    quanGiaBrightness: 1,
    quanGiaOffsetY: 16,
    shakeTimer: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,
    elapsedTime: 0,
    dust: [],
  });

  useEffect(() => {
    gameAudio.setVolume(getConfig('defaultSfxVolume'));
    return () => {
      if (staffKnockTimeoutRef.current !== null) {
        window.clearTimeout(staffKnockTimeoutRef.current);
        staffKnockTimeoutRef.current = null;
      }
      if (sceneShakeTimeoutRef.current !== null) {
        window.clearTimeout(sceneShakeTimeoutRef.current);
        sceneShakeTimeoutRef.current = null;
      }
      if (passcodeShakeTimeoutRef.current !== null) {
        window.clearTimeout(passcodeShakeTimeoutRef.current);
        passcodeShakeTimeoutRef.current = null;
      }
    };
  }, []);

  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    level: 1,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // --- AUTO-SAVE GAMEPLAY PROGRESS TO LOCALSTORAGE ---
  // Strictly guarded so visiting Start Screen (`status === 'START'`) NEVER overwrites a valid save!
  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;
    writeSavedProgress({
      version: 2,
      activeScene,
      scene1LineIndex: currentLineIndex,
      scene1ChoiceVisible: isChoiceVisible,
      scene2Phase,
      checkedChoices,
      activeInspectionId,
      scene3Phase,
      scene3DialogueIndex,
      paperHidden: !isDoPaperOpen,
      hudUnlocked,
      candles: candleCount,
      hintsUsedByScene,
      unlockedBadges,
    });
  }, [
    gameState.status,
    activeScene,
    currentLineIndex,
    isChoiceVisible,
    scene2Phase,
    checkedChoices,
    activeInspectionId,
    scene3Phase,
    scene3DialogueIndex,
    isDoPaperOpen,
    hudUnlocked,
    candleCount,
    hintsUsedByScene,
    unlockedBadges,
  ]);

  useEffect(() => {
    const canHandleBackKey = gameState.status !== 'START' || hasAnyModalOpen;
    (window as CustomWindow).canHandleBackKey = canHandleBackKey;
  }, [gameState.status, hasAnyModalOpen]);

  // Focus & D-pad navigation on Start screen
  useOverlayFocusNavigation(
    startScreenRef,
    gameState.status === 'START' && assetsReady,
  );

  // Focus & D-pad navigation on Top-Left Menu Dropdown
  useOverlayFocusNavigation(
    menuDropdownRef,
    gameState.status === 'PLAYING' && isGameMenuOpen && !isHowToPlayOpen,
  );

  // Focus & D-pad navigation on Scene 2 Step 1 centered dark red choice buttons
  useOverlayFocusNavigation(
    step1MenuRef,
    gameState.status === 'PLAYING' &&
      activeScene === 2 &&
      scene2Phase === 'STEP1_MENU' &&
      !hasAnyModalOpen,
  );

  // Auto-focus bottom action button once dialogue line completes typing
  useEffect(() => {
    if (gameState.status !== 'PLAYING' || hasAnyModalOpen || !isLineComplete) {
      return;
    }
    if (activeScene === 1 && isChoiceVisible) {
      bottomActionBtnRef.current?.focus();
    } else if (activeScene === 2 && scene2Phase !== 'STEP1_MENU') {
      bottomActionBtnRef.current?.focus();
    }
  }, [
    activeScene,
    scene2Phase,
    isChoiceVisible,
    isLineComplete,
    gameState.status,
    hasAnyModalOpen,
  ]);

  const inputRef = useInput(canvasRef, true, {
    width: canvasWidth,
    height: canvasHeight,
  });

  const closeAllSubModals = useCallback(() => {
    setIsGameMenuOpen(false);
    setIsHowToPlayOpen(false);
    setIsHintOverlayOpen(false);
    setHintOverlayView('MAIN');
    setActiveHintModalText(null);
    setIsQuizModalOpen(false);
    setIsCollectionOverlayOpen(false);
    setActiveBadgeDetail(null);
  }, []);

  const startTypewriterForLine = useCallback(
    (
      line: DialogueLine,
      showScene1EndChoiceOnImmediate: boolean,
      forceInstant = false,
    ) => {
      activeDialogueLineRef.current = line;
      const totalLen = line.action.length + 1 + line.dialogue.length;
      const useTypewriter = getConfig('enableTypewriter') && !forceInstant;

      if (useTypewriter) {
        revealedFloatRef.current = 0;
        lastRevealedIntRef.current = 0;
        isLineCompleteRef.current = false;
        setRevealedChars(0);
        setIsLineComplete(false);
        isChoiceVisibleRef.current = false;
        setIsChoiceVisible(false);
      } else {
        revealedFloatRef.current = totalLen;
        lastRevealedIntRef.current = totalLen;
        isLineCompleteRef.current = true;
        setRevealedChars(totalLen);
        setIsLineComplete(true);
        isChoiceVisibleRef.current = showScene1EndChoiceOnImmediate;
        setIsChoiceVisible(showScene1EndChoiceOnImmediate);
      }
    },
    [],
  );

  const activateScene1Line = useCallback(
    (index: number, forceCompleteChoice = false) => {
      const clampedIndex = clamp(index, 0, SCENE_1_SCRIPT.length - 1);
      const line = SCENE_1_SCRIPT[clampedIndex] ?? SCENE_1_SCRIPT[0];
      currentLineIndexRef.current = clampedIndex;
      setCurrentLineIndex(clampedIndex);

      const isLastLine = clampedIndex === SCENE_1_SCRIPT.length - 1;
      startTypewriterForLine(line, isLastLine, forceCompleteChoice && isLastLine);

      if (staffKnockTimeoutRef.current !== null) {
        window.clearTimeout(staffKnockTimeoutRef.current);
        staffKnockTimeoutRef.current = null;
      }
      if (line.dramaticShake && !forceCompleteChoice) {
        gameAudio.playFootstepWood();
        staffKnockTimeoutRef.current = window.setTimeout(() => {
          staffKnockTimeoutRef.current = null;
          if (
            gameStateRef.current.status === 'PLAYING' &&
            activeSceneRef.current === 1 &&
            currentLineIndexRef.current === clampedIndex
          ) {
            gameAudio.playFootstepWood();
          }
        }, 140);
        if (getConfig('enableDialogueShake')) {
          sceneRenderRef.current.shakeTimer = getConfig(
            'dialogueShakeDuration',
          );
        }
      } else {
        sceneRenderRef.current.shakeTimer = 0;
        sceneRenderRef.current.shakeOffsetX = 0;
        sceneRenderRef.current.shakeOffsetY = 0;
        setDialogueShakeOffset({x: 0, y: 0});
      }
    },
    [startTypewriterForLine],
  );

  const activateScene3DialogueLine = useCallback(
    (index: number) => {
      const clampedIndex = clamp(index, 0, SCENE_3_DIALOGUE_SCRIPT.length - 1);
      const line =
        SCENE_3_DIALOGUE_SCRIPT[clampedIndex] ?? SCENE_3_DIALOGUE_SCRIPT[0];
      scene3DialogueIndexRef.current = clampedIndex;
      setScene3DialogueIndex(clampedIndex);
      startTypewriterForLine(line, false);
    },
    [startTypewriterForLine],
  );

  const triggerSceneShudderShake = useCallback(() => {
    if (sceneShakeTimeoutRef.current !== null) {
      window.clearTimeout(sceneShakeTimeoutRef.current);
      sceneShakeTimeoutRef.current = null;
    }
    setIsSceneShaking(false);
    window.requestAnimationFrame(() => {
      setIsSceneShaking(true);
      sceneShakeTimeoutRef.current = window.setTimeout(() => {
        sceneShakeTimeoutRef.current = null;
        setIsSceneShaking(false);
      }, 620);
    });
  }, []);

  const triggerPasscodeShake = useCallback(() => {
    if (passcodeShakeTimeoutRef.current !== null) {
      window.clearTimeout(passcodeShakeTimeoutRef.current);
      passcodeShakeTimeoutRef.current = null;
    }
    setIsPasscodeShaking(false);
    window.requestAnimationFrame(() => {
      setIsPasscodeShaking(true);
      passcodeShakeTimeoutRef.current = window.setTimeout(() => {
        passcodeShakeTimeoutRef.current = null;
        setIsPasscodeShaking(false);
      }, 460);
    });
  }, []);

  const enterScene2Clean = useCallback(() => {
    if (staffKnockTimeoutRef.current !== null) {
      window.clearTimeout(staffKnockTimeoutRef.current);
      staffKnockTimeoutRef.current = null;
    }
    if (sceneShakeTimeoutRef.current !== null) {
      window.clearTimeout(sceneShakeTimeoutRef.current);
      sceneShakeTimeoutRef.current = null;
    }

    closeAllSubModals();
    setIsRewardPopupOpen(false);
    setIsSceneShaking(false);
    setDialogueShakeOffset({x: 0, y: 0});

    activeSceneRef.current = 2;
    setActiveScene(2);
    scene2PhaseRef.current = 'STEP1_MENU';
    setScene2Phase('STEP1_MENU');
    checkedChoicesRef.current = [];
    setCheckedChoices([]);
    activeInspectionIdRef.current = null;
    setActiveInspectionId(null);
    isChoiceVisibleRef.current = false;
    setIsChoiceVisible(false);

    sceneRenderRef.current.lienAlpha = 0;
    sceneRenderRef.current.lienBrightness = 1;
    sceneRenderRef.current.lienOffsetY = 18;
    sceneRenderRef.current.quanGiaAlpha = 0;
    sceneRenderRef.current.quanGiaBrightness = 0;
    sceneRenderRef.current.shakeTimer = 0;
    sceneRenderRef.current.shakeOffsetX = 0;
    sceneRenderRef.current.shakeOffsetY = 0;

    setGameState((prev) => ({
      ...prev,
      status: 'PLAYING',
      level: 2,
    }));
  }, [closeAllSubModals]);

  const enterScene3Clean = useCallback(() => {
    if (staffKnockTimeoutRef.current !== null) {
      window.clearTimeout(staffKnockTimeoutRef.current);
      staffKnockTimeoutRef.current = null;
    }
    if (sceneShakeTimeoutRef.current !== null) {
      window.clearTimeout(sceneShakeTimeoutRef.current);
      sceneShakeTimeoutRef.current = null;
    }

    closeAllSubModals();
    setIsRewardPopupOpen(false);
    setIsSceneShaking(false);
    setDialogueShakeOffset({x: 0, y: 0});

    // Unlock Top-Right HUD ("Gợi ý" & "Bộ sưu tập") from Scene 3 onwards
    // Begin at Phase 1 ('dialogue') with Liên's 4-line thought sequence + Dó paper visible
    activeSceneRef.current = 3;
    setActiveScene(3);
    scene3PhaseRef.current = 'dialogue';
    setScene3Phase('dialogue');
    scene3DialogueIndexRef.current = 0;
    setScene3DialogueIndex(0);
    setHudUnlocked(true);
    setIsDoPaperOpen(true);
    setPasscodeInput('');
    setPasscodeError('');
    setIsPasscodeShaking(false);
    isChoiceVisibleRef.current = false;
    setIsChoiceVisible(false);

    // Show Liên portrait for Phase 1 dialogue; strictly hide Quản gia Lâm
    sceneRenderRef.current.lienAlpha = 0.25;
    sceneRenderRef.current.lienBrightness = 1;
    sceneRenderRef.current.lienOffsetY = 14;
    sceneRenderRef.current.quanGiaAlpha = 0;
    sceneRenderRef.current.quanGiaBrightness = 0;
    sceneRenderRef.current.shakeTimer = 0;
    sceneRenderRef.current.shakeOffsetX = 0;
    sceneRenderRef.current.shakeOffsetY = 0;

    activateScene3DialogueLine(0);

    setGameState((prev) => ({
      ...prev,
      status: 'PLAYING',
      level: 3,
    }));
  }, [activateScene3DialogueLine, closeAllSubModals]);

  const startFreshRun = useCallback(() => {
    closeAllSubModals();
    setIsRewardPopupOpen(false);
    setIsSceneShaking(false);

    setHudUnlocked(false);
    setCandleCount(INITIAL_KNOWLEDGE_CANDLES);
    setHintsUsedByScene({});
    setUnlockedBadges([]);

    checkedChoicesRef.current = [];
    setCheckedChoices([]);
    activeInspectionIdRef.current = null;
    setActiveInspectionId(null);
    scene2PhaseRef.current = 'STEP1_MENU';
    setScene2Phase('STEP1_MENU');
    scene3PhaseRef.current = 'dialogue';
    setScene3Phase('dialogue');
    scene3DialogueIndexRef.current = 0;
    setScene3DialogueIndex(0);
    setIsDoPaperOpen(true);
    setPasscodeInput('');
    setPasscodeError('');

    sceneRenderRef.current = {
      lienAlpha: 0,
      lienBrightness: 1,
      lienOffsetY: 22,
      quanGiaAlpha: 0,
      quanGiaBrightness: 1,
      quanGiaOffsetY: 22,
      shakeTimer: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      elapsedTime: 0,
      dust: createInitialDust(),
    };
    setDialogueShakeOffset({x: 0, y: 0});

    activeSceneRef.current = 1;
    setActiveScene(1);

    setGameState({
      status: 'PLAYING',
      level: 1,
      score: 0,
    });

    activateScene1Line(0);
  }, [activateScene1Line, closeAllSubModals, createInitialDust]);

  const resumeSavedRun = useCallback(
    (saved: SavedGameProgress) => {
      closeAllSubModals();
      setIsSceneShaking(false);
      setPasscodeInput('');
      setPasscodeError('');
      setIsPasscodeShaking(false);

      setHudUnlocked(saved.hudUnlocked || saved.activeScene >= 3);
      setCandleCount(saved.candles);
      setHintsUsedByScene(saved.hintsUsedByScene);
      setUnlockedBadges(saved.unlockedBadges);

      checkedChoicesRef.current = saved.checkedChoices;
      setCheckedChoices(saved.checkedChoices);
      activeInspectionIdRef.current = saved.activeInspectionId;
      setActiveInspectionId(saved.activeInspectionId);
      scene2PhaseRef.current = saved.scene2Phase;
      setScene2Phase(saved.scene2Phase);
      scene3PhaseRef.current = saved.scene3Phase;
      setScene3Phase(saved.scene3Phase);
      scene3DialogueIndexRef.current = saved.scene3DialogueIndex;
      setScene3DialogueIndex(saved.scene3DialogueIndex);
      setIsDoPaperOpen(!saved.paperHidden);
      setIsRewardPopupOpen(
        saved.activeScene === 3 && saved.scene3Phase === 'reward',
      );

      sceneRenderRef.current = {
        lienAlpha: 0,
        lienBrightness: 1,
        lienOffsetY: 16,
        quanGiaAlpha: 0,
        quanGiaBrightness: 1,
        quanGiaOffsetY: 16,
        shakeTimer: 0,
        shakeOffsetX: 0,
        shakeOffsetY: 0,
        elapsedTime: 0,
        dust: createInitialDust(),
      };
      setDialogueShakeOffset({x: 0, y: 0});

      activeSceneRef.current = saved.activeScene;
      setActiveScene(saved.activeScene);

      if (saved.activeScene === 1) {
        sceneRenderRef.current.lienAlpha = 1;
        sceneRenderRef.current.quanGiaAlpha =
          saved.scene1LineIndex >= 3 ? 1 : 0;
        activateScene1Line(saved.scene1LineIndex, saved.scene1ChoiceVisible);
      } else if (saved.activeScene === 2) {
        isChoiceVisibleRef.current = false;
        setIsChoiceVisible(false);
        if (saved.scene2Phase === 'STEP1_INSPECT' && saved.activeInspectionId) {
          const item = SCENE_2_INSPECTIONS.find(
            (entry) => entry.id === saved.activeInspectionId,
          );
          if (item) {
            sceneRenderRef.current.lienAlpha = 1;
            startTypewriterForLine(
              {
                id: 100,
                speaker: item.speaker,
                spriteId: 'sprite_lien_hoodie',
                action: item.action,
                dialogue: item.dialogue,
              },
              false,
            );
          } else {
            scene2PhaseRef.current = 'STEP1_MENU';
            setScene2Phase('STEP1_MENU');
          }
        } else if (saved.scene2Phase === 'STEP2_SHUDDER') {
          sceneRenderRef.current.lienAlpha = 1;
          startTypewriterForLine(SCENE_2_SHUDDER_LINE, false);
        } else if (saved.scene2Phase === 'STEP2_PAPER') {
          sceneRenderRef.current.lienAlpha = 1;
          startTypewriterForLine(SCENE_2_DO_PAPER_LINE, false);
        }
      } else if (saved.activeScene === 3) {
        isChoiceVisibleRef.current = false;
        setIsChoiceVisible(false);
        if (saved.scene3Phase === 'dialogue') {
          sceneRenderRef.current.lienAlpha = 1;
          sceneRenderRef.current.lienBrightness = 1;
          activateScene3DialogueLine(saved.scene3DialogueIndex);
        } else {
          sceneRenderRef.current.lienAlpha = 0;
          sceneRenderRef.current.lienBrightness = 0;
          if (saved.scene3Phase === 'reward') {
            setUnlockedBadges((prev) =>
              prev.includes(BIA_TIEN_SI_BADGE.id)
                ? prev
                : [...prev, BIA_TIEN_SI_BADGE.id],
            );
          }
        }
      } else {
        isChoiceVisibleRef.current = false;
        setIsChoiceVisible(false);
      }

      setGameState({
        status: 'PLAYING',
        level: saved.activeScene,
        score: saved.activeScene >= 4 ? getConfig('completionScore') : 0,
      });
    },
    [
      activateScene1Line,
      activateScene3DialogueLine,
      closeAllSubModals,
      createInitialDust,
      startTypewriterForLine,
    ],
  );

  // Start Screen "Chơi" button: resumes from localStorage if saved progress exists, else starts fresh
  const initGame = useCallback(() => {
    gameAudio.playConfirmSelect();
    const saved = readSavedProgress();
    if (saved) {
      resumeSavedRun(saved);
    } else {
      startFreshRun();
    }
  }, [resumeSavedRun, startFreshRun]);

  const resetGame = useCallback(() => {
    gameAudio.playConfirmSelect();
    startFreshRun();
  }, [startFreshRun]);

  // Top-Left Menu "Xóa tiến trình": clears localStorage, resets ALL game states to defaults, returns to Start Screen
  const handleClearProgressAndReturnStart = useCallback(() => {
    gameAudio.playConfirmSelect();
    if (staffKnockTimeoutRef.current !== null) {
      window.clearTimeout(staffKnockTimeoutRef.current);
      staffKnockTimeoutRef.current = null;
    }
    if (sceneShakeTimeoutRef.current !== null) {
      window.clearTimeout(sceneShakeTimeoutRef.current);
      sceneShakeTimeoutRef.current = null;
    }
    if (passcodeShakeTimeoutRef.current !== null) {
      window.clearTimeout(passcodeShakeTimeoutRef.current);
      passcodeShakeTimeoutRef.current = null;
    }

    clearSavedProgress();
    closeAllSubModals();
    setIsRewardPopupOpen(false);
    setIsSceneShaking(false);
    setIsPasscodeShaking(false);
    setDialogueShakeOffset({x: 0, y: 0});

    activeSceneRef.current = 1;
    setActiveScene(1);
    currentLineIndexRef.current = 0;
    setCurrentLineIndex(0);
    isChoiceVisibleRef.current = false;
    setIsChoiceVisible(false);

    scene2PhaseRef.current = 'STEP1_MENU';
    setScene2Phase('STEP1_MENU');
    checkedChoicesRef.current = [];
    setCheckedChoices([]);
    activeInspectionIdRef.current = null;
    setActiveInspectionId(null);

    scene3PhaseRef.current = 'dialogue';
    setScene3Phase('dialogue');
    scene3DialogueIndexRef.current = 0;
    setScene3DialogueIndex(0);
    setIsDoPaperOpen(true);
    setPasscodeInput('');
    setPasscodeError('');

    setHudUnlocked(false);
    setCandleCount(INITIAL_KNOWLEDGE_CANDLES);
    setHintsUsedByScene({});
    setUnlockedBadges([]);

    sceneRenderRef.current.lienAlpha = 0;
    sceneRenderRef.current.quanGiaAlpha = 0;

    setGameState({
      status: 'START',
      score: 0,
      level: 1,
    });
  }, [closeAllSubModals]);

  const completeCurrentTypewriterImmediately = useCallback(() => {
    const line = activeDialogueLineRef.current;
    const totalLen = line.action.length + 1 + line.dialogue.length;
    revealedFloatRef.current = totalLen;
    lastRevealedIntRef.current = totalLen;
    isLineCompleteRef.current = true;
    setRevealedChars(totalLen);
    setIsLineComplete(true);

    if (
      activeSceneRef.current === 1 &&
      currentLineIndexRef.current === SCENE_1_SCRIPT.length - 1
    ) {
      isChoiceVisibleRef.current = true;
      setIsChoiceVisible(true);
    }
  }, []);

  const handleAdvanceDialogue = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      isPausedOverlayRef.current
    ) {
      return;
    }

    // Scene 3 Phase 1 ('dialogue'): advance through Liên's 4 thought lines -> transition to Phase 2 ('puzzle')
    if (activeSceneRef.current === 3) {
      if (scene3PhaseRef.current !== 'dialogue') return;
      if (!isLineCompleteRef.current) {
        gameAudio.playCrispClick();
        completeCurrentTypewriterImmediately();
        return;
      }
      const s3Idx = scene3DialogueIndexRef.current;
      if (s3Idx < SCENE_3_DIALOGUE_SCRIPT.length - 1) {
        gameAudio.playCrispClick();
        activateScene3DialogueLine(s3Idx + 1);
        return;
      }
      // After Line 4 ends -> immediately hide Dialogue Box & Liên's sprite, enter Phase 2 ('puzzle')
      gameAudio.playConfirmSelect();
      scene3PhaseRef.current = 'puzzle';
      setScene3Phase('puzzle');
      setIsDoPaperOpen(true);
      sceneRenderRef.current.lienAlpha = 0;
      sceneRenderRef.current.lienBrightness = 0;
      sceneRenderRef.current.quanGiaAlpha = 0;
      window.requestAnimationFrame(() => {
        passcodeInputRef.current?.focus();
      });
      return;
    }

    if (activeSceneRef.current >= 4) {
      return;
    }

    if (activeSceneRef.current === 2) {
      if (scene2PhaseRef.current === 'STEP1_MENU') return;
      if (!isLineCompleteRef.current) {
        gameAudio.playCrispClick();
        completeCurrentTypewriterImmediately();
      } else {
        bottomActionBtnRef.current?.focus();
      }
      return;
    }

    const idx = currentLineIndexRef.current;
    if (!isLineCompleteRef.current) {
      gameAudio.playCrispClick();
      completeCurrentTypewriterImmediately();
      return;
    }

    if (idx < SCENE_1_SCRIPT.length - 1) {
      gameAudio.playCrispClick();
      activateScene1Line(idx + 1);
      return;
    }

    if (!isChoiceVisibleRef.current) {
      gameAudio.playCrispClick();
      isChoiceVisibleRef.current = true;
      setIsChoiceVisible(true);
    } else {
      bottomActionBtnRef.current?.focus();
    }
  }, [
    completeCurrentTypewriterImmediately,
    activateScene1Line,
    activateScene3DialogueLine,
  ]);

  // Scene 1 -> Scene 2 Direct Transition
  const handleSelectScene1Choice = useCallback(() => {
    if (gameStateRef.current.status !== 'PLAYING') return;
    gameAudio.playConfirmSelect();
    enterScene2Clean();
  }, [enterScene2Clean]);

  // Scene 2 Step 1: Click (A), (B), or (C)
  const handleSelectScene2Inspection = useCallback(
    (choiceId: Scene2ChoiceId) => {
      if (
        gameStateRef.current.status !== 'PLAYING' ||
        activeSceneRef.current !== 2
      ) {
        return;
      }
      const item = SCENE_2_INSPECTIONS.find((entry) => entry.id === choiceId);
      if (!item) return;

      gameAudio.playConfirmSelect();
      activeInspectionIdRef.current = choiceId;
      setActiveInspectionId(choiceId);
      scene2PhaseRef.current = 'STEP1_INSPECT';
      setScene2Phase('STEP1_INSPECT');

      sceneRenderRef.current.lienAlpha = 0.25;
      sceneRenderRef.current.lienBrightness = 1;
      sceneRenderRef.current.lienOffsetY = 14;
      sceneRenderRef.current.quanGiaAlpha = 0;

      const lineObj: DialogueLine = {
        id: choiceId === 'A' ? 101 : choiceId === 'B' ? 102 : 103,
        speaker: item.speaker,
        spriteId: 'sprite_lien_hoodie',
        action: item.action,
        dialogue: item.dialogue,
      };
      startTypewriterForLine(lineObj, false);
    },
    [startTypewriterForLine],
  );

  // Scene 2 Step 1: Click "Quay lại"
  const handleScene2Back = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      activeSceneRef.current !== 2 ||
      scene2PhaseRef.current !== 'STEP1_INSPECT'
    ) {
      return;
    }

    const justInspected = activeInspectionIdRef.current;
    const nextChecked =
      justInspected && !checkedChoicesRef.current.includes(justInspected)
        ? [...checkedChoicesRef.current, justInspected]
        : [...checkedChoicesRef.current];

    checkedChoicesRef.current = nextChecked;
    setCheckedChoices(nextChecked);
    activeInspectionIdRef.current = null;
    setActiveInspectionId(null);

    if (nextChecked.length >= SCENE_2_INSPECTIONS.length) {
      gameAudio.playFootstepWood();
      triggerSceneShudderShake();

      scene2PhaseRef.current = 'STEP2_SHUDDER';
      setScene2Phase('STEP2_SHUDDER');
      sceneRenderRef.current.lienAlpha = 1;
      sceneRenderRef.current.lienBrightness = 1;
      sceneRenderRef.current.lienOffsetY = 0;
      sceneRenderRef.current.quanGiaAlpha = 0;

      startTypewriterForLine(SCENE_2_SHUDDER_LINE, false);
      return;
    }

    gameAudio.playCrispClick();
    scene2PhaseRef.current = 'STEP1_MENU';
    setScene2Phase('STEP1_MENU');
    sceneRenderRef.current.lienAlpha = 0;
    sceneRenderRef.current.quanGiaAlpha = 0;
  }, [startTypewriterForLine, triggerSceneShudderShake]);

  // Scene 2 Step 2: Click "(A) Kiểm tra túi trước áo hoodie"
  const handleCheckHoodiePocket = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      activeSceneRef.current !== 2 ||
      scene2PhaseRef.current !== 'STEP2_SHUDDER'
    ) {
      return;
    }
    gameAudio.playConfirmSelect();
    scene2PhaseRef.current = 'STEP2_PAPER';
    setScene2Phase('STEP2_PAPER');
    sceneRenderRef.current.lienAlpha = 1;
    sceneRenderRef.current.lienBrightness = 1;
    sceneRenderRef.current.quanGiaAlpha = 0;

    startTypewriterForLine(SCENE_2_DO_PAPER_LINE, false);
  }, [startTypewriterForLine]);

  // Scene 2 Step 2: Click "Đọc tờ giấy dó" -> Direct Transition to Scene 3
  const handleReadDoPaper = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      activeSceneRef.current !== 2
    ) {
      return;
    }
    gameAudio.playConfirmSelect();
    enterScene3Clean();
  }, [enterScene3Clean]);

  // Scene 3 Phase 2 -> Phase 3 ('explanation'): Submit 4-digit Passcode
  const handleSubmitScene3Passcode = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      activeSceneRef.current !== 3 ||
      scene3PhaseRef.current !== 'puzzle'
    ) {
      return;
    }
    const trimmed = passcodeInput.trim();
    if (trimmed === SCENE_3_CORRECT_PASSCODE) {
      gameAudio.playVictoryFanfare();
      setPasscodeError('');
      scene3PhaseRef.current = 'explanation';
      setScene3Phase('explanation');
      return;
    }

    gameAudio.playErrorBuzz();
    setPasscodeError(SCENE_3_WRONG_PASSCODE_MSG);
    triggerPasscodeShake();
  }, [passcodeInput, triggerPasscodeShake]);

  // Scene 3 Phase 3 ('explanation') -> Claim Reward ('reward'): Unlocks badge + opens Reward Popup
  const handleClaimScene3Reward = useCallback(() => {
    if (
      gameStateRef.current.status !== 'PLAYING' ||
      activeSceneRef.current !== 3
    ) {
      return;
    }
    gameAudio.playPowerupChime();
    setUnlockedBadges((prev) =>
      prev.includes(BIA_TIEN_SI_BADGE.id)
        ? prev
        : [...prev, BIA_TIEN_SI_BADGE.id],
    );
    scene3PhaseRef.current = 'reward';
    setScene3Phase('reward');
    setIsRewardPopupOpen(true);
  }, []);

  // Scene 3 Reward Popup -> Proceed to Scene 4 Preparation Placeholder
  const handleContinueToScene4 = useCallback(() => {
    gameAudio.playConfirmSelect();
    setIsRewardPopupOpen(false);
    setActiveBadgeDetail(null);
    activeSceneRef.current = 4;
    setActiveScene(4);
    sceneRenderRef.current.lienAlpha = 0;
    sceneRenderRef.current.quanGiaAlpha = 0;
    setGameState((prev) => ({
      ...prev,
      status: 'PLAYING',
      level: 4,
      score: Math.max(prev.score, getConfig('completionScore')),
    }));
  }, []);

  // --- HINT SYSTEM HANDLERS ---
  const hintSceneKey = activeScene >= 3 ? 3 : activeScene;
  const currentSceneHintsUsed = hintsUsedByScene[hintSceneKey] ?? 0;
  const currentSceneHintPool = SCENE_HINTS_BY_SCENE[hintSceneKey] ?? [];
  const isSceneHintsExhausted = currentSceneHintsUsed >= MAX_HINTS_PER_SCENE;

  const handleOpenHintOverlay = useCallback(() => {
    gameAudio.playCrispClick();
    setIsCollectionOverlayOpen(false);
    setIsGameMenuOpen(false);
    setIsHowToPlayOpen(false);
    setHintOverlayView('MAIN');
    setIsHintOverlayOpen(true);
  }, []);

  const handleOpenCollectionOverlay = useCallback(() => {
    gameAudio.playCrispClick();
    setIsHintOverlayOpen(false);
    setIsGameMenuOpen(false);
    setIsHowToPlayOpen(false);
    setIsCollectionOverlayOpen(true);
  }, []);

  const handleRequestHintClick = useCallback(() => {
    if (isSceneHintsExhausted) {
      gameAudio.playErrorBuzz();
      return;
    }
    gameAudio.playCrispClick();
    setHintOverlayView('CONFIRM');
  }, [isSceneHintsExhausted]);

  const handleConfirmSpendCandleForHint = useCallback(() => {
    if (isSceneHintsExhausted || candleCount <= 0) {
      gameAudio.playErrorBuzz();
      return;
    }

    const nextHintIndex = currentSceneHintsUsed; // 0, 1, or 2
    const hintText =
      currentSceneHintPool[nextHintIndex] ?? currentSceneHintPool[0] ?? '';

    gameAudio.playPowerupChime();
    setCandleCount((prev) => Math.max(0, prev - 1));
    setHintsUsedByScene((prev) => ({
      ...prev,
      [hintSceneKey]: nextHintIndex + 1,
    }));
    setHintOverlayView('MAIN');
    setActiveHintModalText(hintText);
  }, [
    candleCount,
    currentSceneHintPool,
    currentSceneHintsUsed,
    hintSceneKey,
    isSceneHintsExhausted,
  ]);

  const handleReviewUnlockedHints = useCallback(() => {
    if (currentSceneHintsUsed <= 0) return;
    gameAudio.playCrispClick();
    const unlockedTexts = currentSceneHintPool
      .slice(0, currentSceneHintsUsed)
      .join('\n\n• ');
    setActiveHintModalText(
      currentSceneHintsUsed > 1 ? `• ${unlockedTexts}` : unlockedTexts,
    );
  }, [currentSceneHintPool, currentSceneHintsUsed]);

  // --- QUIZ MINI-GAME HANDLERS ---
  const startNewQuizRound = useCallback(() => {
    const picked = pickTwoWeightedQuizQuestions();
    setQuizQuestions(picked);
    setQuizStepIndex(0);
    setQuizAnswerInput('');
    setQuizRoundStatus('ANSWERING');
    setIsQuizModalOpen(true);
    window.requestAnimationFrame(() => {
      quizInputRef.current?.focus();
    });
  }, []);

  const handleOpenQuizFromHint = useCallback(() => {
    gameAudio.playConfirmSelect();
    startNewQuizRound();
  }, [startNewQuizRound]);

  const handleSubmitQuizAnswer = useCallback(
    (submittedAnswer: string) => {
      if (quizRoundStatus !== 'ANSWERING') return;
      const currentQ = quizQuestions[quizStepIndex];
      if (!currentQ) return;

      const normalizedUser = submittedAnswer.trim().toUpperCase();
      const normalizedCorrect = currentQ.correct.trim().toUpperCase();

      if (normalizedUser === normalizedCorrect) {
        if (quizStepIndex + 1 >= quizQuestions.length) {
          // Both 2 random questions answered correctly -> +1 Knowledge Candle
          gameAudio.playPowerupChime();
          setCandleCount((prev) => prev + 1);
          setQuizRoundStatus('WON');
        } else {
          gameAudio.playConfirmSelect();
          setQuizStepIndex((prev) => prev + 1);
          setQuizAnswerInput('');
          window.requestAnimationFrame(() => {
            quizInputRef.current?.focus();
          });
        }
      } else {
        gameAudio.playErrorBuzz();
        setQuizRoundStatus('FAILED');
      }
    },
    [quizQuestions, quizRoundStatus, quizStepIndex],
  );

  // Optional A / B / C hotkey support in Scene 2 choice steps
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (
        gameStateRef.current.status !== 'PLAYING' ||
        isPausedOverlayRef.current ||
        activeSceneRef.current !== 2
      ) {
        return;
      }
      const upper = e.key.toUpperCase();
      if (scene2PhaseRef.current === 'STEP1_MENU') {
        if (
          (upper === 'A' || upper === 'B' || upper === 'C') &&
          !checkedChoicesRef.current.includes(upper as Scene2ChoiceId)
        ) {
          e.preventDefault();
          handleSelectScene2Inspection(upper as Scene2ChoiceId);
        }
      } else if (
        scene2PhaseRef.current === 'STEP2_SHUDDER' &&
        upper === 'A'
      ) {
        e.preventDefault();
        handleCheckHoodiePocket();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectScene2Inspection, handleCheckHoodiePocket]);

  // Auto-start when ?autoplay is in the URL
  const hasAutoplayed = useRef(false);
  useEffect(() => {
    if (
      !hasAutoplayed.current &&
      new URLSearchParams(window.location.search).has('autoplay')
    ) {
      hasAutoplayed.current = true;
      initGame();
    }
  }, [initGame]);

  useEffect(() => {
    if (sceneRenderRef.current.dust.length === 0) {
      sceneRenderRef.current.dust = createInitialDust();
    }
  }, [createInitialDust]);

  // --- PER-FRAME UPDATE ---
  const update = (deltaTime: number) => {
    const renderState = sceneRenderRef.current;
    renderState.elapsedTime += deltaTime;

    for (let i = 0; i < renderState.dust.length; i++) {
      const p = renderState.dust[i];
      if (!p) continue;
      p.x +=
        p.vx * deltaTime + Math.sin(renderState.elapsedTime + p.phase) * 0.25;
      p.y += p.vy * deltaTime;
      if (p.y < -10) {
        p.y = canvasHeight * 0.78;
        p.x = Math.random() * canvasWidth;
      }
      if (p.x < -10) p.x = canvasWidth + 10;
      if (p.x > canvasWidth + 10) p.x = -10;
    }

    if (
      gameStateRef.current.status !== 'PLAYING' ||
      isPausedOverlayRef.current
    ) {
      lastConfirmRef.current = Boolean(inputRef.current?.actions.confirm);
      return;
    }

    const curScene = activeSceneRef.current;
    const s2Phase = scene2PhaseRef.current;
    const s3Phase = scene3PhaseRef.current;
    const isDialogueVisible =
      curScene === 1 ||
      (curScene === 2 && s2Phase !== 'STEP1_MENU') ||
      (curScene === 3 && s3Phase === 'dialogue');

    const confirmPressed = Boolean(inputRef.current?.actions.confirm);
    if (confirmPressed && !lastConfirmRef.current && isDialogueVisible) {
      const activeEl = document.activeElement;
      const isFocusedOnControl =
        (activeEl instanceof HTMLButtonElement && !activeEl.disabled) ||
        activeEl instanceof HTMLInputElement;
      if (!isFocusedOnControl) {
        handleAdvanceDialogue();
      }
    }
    lastConfirmRef.current = confirmPressed;

    if (isDialogueVisible && !isLineCompleteRef.current) {
      const line = activeDialogueLineRef.current;
      const totalLen = line.action.length + 1 + line.dialogue.length;
      const speed = getConfig('typewriterCharsPerSec');
      revealedFloatRef.current = Math.min(
        totalLen,
        revealedFloatRef.current + speed * deltaTime,
      );
      const nextInt = Math.floor(revealedFloatRef.current);
      if (nextInt !== lastRevealedIntRef.current) {
        lastRevealedIntRef.current = nextInt;
        setRevealedChars(nextInt);
      }
      if (nextInt >= totalLen) {
        isLineCompleteRef.current = true;
        setIsLineComplete(true);
        if (
          curScene === 1 &&
          currentLineIndexRef.current === SCENE_1_SCRIPT.length - 1
        ) {
          isChoiceVisibleRef.current = true;
          setIsChoiceVisible(true);
        }
      }
    }

    const lerpRate = Math.min(
      1,
      getConfig('portraitTransitionSpeed') * deltaTime,
    );

    if (curScene === 1) {
      const activeLine = SCENE_1_SCRIPT[currentLineIndexRef.current];
      const isLienSpeaking = activeLine?.spriteId === 'sprite_lien_hoodie';
      const isQuanGiaSpeaking = activeLine?.spriteId === 'sprite_quan_gia_lam';
      const hasQuanGiaAppeared = currentLineIndexRef.current >= 3;
      const dimBrightness = getConfig('inactivePortraitBrightness');

      const targetLienAlpha = 1;
      const targetLienBrightness = isLienSpeaking ? 1 : dimBrightness;
      const targetLienOffset = isLienSpeaking ? 0 : 12;

      const targetQuanGiaAlpha = hasQuanGiaAppeared ? 1 : 0;
      const targetQuanGiaBrightness = isQuanGiaSpeaking
        ? 1
        : dimBrightness * 0.85;
      const targetQuanGiaOffset = isQuanGiaSpeaking ? 0 : 14;

      renderState.lienAlpha +=
        (targetLienAlpha - renderState.lienAlpha) * lerpRate;
      renderState.lienBrightness +=
        (targetLienBrightness - renderState.lienBrightness) * lerpRate;
      renderState.lienOffsetY +=
        (targetLienOffset - renderState.lienOffsetY) * lerpRate;

      renderState.quanGiaAlpha +=
        (targetQuanGiaAlpha - renderState.quanGiaAlpha) * lerpRate;
      renderState.quanGiaBrightness +=
        (targetQuanGiaBrightness - renderState.quanGiaBrightness) * lerpRate;
      renderState.quanGiaOffsetY +=
        (targetQuanGiaOffset - renderState.quanGiaOffsetY) * lerpRate;
    } else if (curScene === 2) {
      renderState.quanGiaAlpha = 0;
      renderState.quanGiaBrightness = 0;

      if (s2Phase === 'STEP1_MENU') {
        renderState.lienAlpha = 0;
      } else {
        renderState.lienAlpha += (1 - renderState.lienAlpha) * lerpRate;
        renderState.lienBrightness +=
          (1 - renderState.lienBrightness) * lerpRate;
        renderState.lienOffsetY += (0 - renderState.lienOffsetY) * lerpRate;
      }
    } else if (curScene === 3 && s3Phase === 'dialogue') {
      // Scene 3 Phase 1 ('dialogue'): Liên speaks 4 thought lines; Quản gia Lâm strictly hidden
      renderState.quanGiaAlpha = 0;
      renderState.quanGiaBrightness = 0;
      renderState.lienAlpha += (1 - renderState.lienAlpha) * lerpRate;
      renderState.lienBrightness += (1 - renderState.lienBrightness) * lerpRate;
      renderState.lienOffsetY += (0 - renderState.lienOffsetY) * lerpRate;
    } else {
      // Scene 3 Phase 2+ & Scene 4: Strictly hide BOTH Quản gia Lâm AND Liên
      renderState.quanGiaAlpha = 0;
      renderState.quanGiaBrightness = 0;
      renderState.lienAlpha = 0;
      renderState.lienBrightness = 0;
    }

    if (renderState.shakeTimer > 0) {
      renderState.shakeTimer = Math.max(0, renderState.shakeTimer - deltaTime);
      const maxDur = Math.max(0.01, getConfig('dialogueShakeDuration'));
      const ratio = renderState.shakeTimer / maxDur;
      const amp = getConfig('dialogueShakeIntensity') * ratio;
      const sx = Math.sin(renderState.elapsedTime * 68) * amp;
      const sy = Math.cos(renderState.elapsedTime * 54) * amp * 0.55;
      renderState.shakeOffsetX = sx;
      renderState.shakeOffsetY = sy;
      setDialogueShakeOffset({x: sx, y: sy});
    } else if (
      renderState.shakeOffsetX !== 0 ||
      renderState.shakeOffsetY !== 0
    ) {
      renderState.shakeOffsetX = 0;
      renderState.shakeOffsetY = 0;
      setDialogueShakeOffset({x: 0, y: 0});
    }
  };

  // --- PER-FRAME CANVAS RENDER ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    prepareCanvas(ctx, canvasWidth, canvasHeight);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const status = gameStateRef.current.status;
    const renderState = sceneRenderRef.current;

    if (status === 'START') {
      drawBackground(
        ctx,
        assets['menu_background'],
        canvasWidth,
        canvasHeight,
        THEME.colors.menuFallbackBottom,
      );
      if (
        !assets['menu_background'] ||
        !assets['menu_background']?.complete ||
        assets['menu_background']?.naturalWidth === 0
      ) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        grad.addColorStop(0, THEME.colors.menuFallbackTop);
        grad.addColorStop(1, THEME.colors.menuFallbackBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      return;
    }

    const curScene = activeSceneRef.current;
    const s2Phase = scene2PhaseRef.current;
    const s3Phase = scene3PhaseRef.current;
    const bgSlot =
      SCENE_BACKGROUND_REGISTRY[curScene] ?? SCENE_BACKGROUND_REGISTRY[1];
    const sceneBg = assets[bgSlot.key];

    // LAYER 1 (Back - Nền): Dynamic Scene Background (`scene1_background` or `nencanh2`)
    drawBackground(
      ctx,
      sceneBg,
      canvasWidth,
      canvasHeight,
      THEME.colors.sceneFallbackBottom,
    );

    if (!sceneBg || !sceneBg.complete || sceneBg.naturalWidth === 0) {
      if (curScene >= 2) {
        drawProceduralScene2Background(
          ctx,
          canvasWidth,
          canvasHeight,
          renderState.elapsedTime,
        );
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        bgGrad.addColorStop(0, THEME.colors.sceneFallbackTop);
        bgGrad.addColorStop(1, THEME.colors.sceneFallbackBottom);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.fillStyle = 'rgba(130, 160, 185, 0.14)';
        ctx.fillRect(canvasWidth * 0.66, canvasHeight * 0.24, 180, 310);
        ctx.fillStyle = '#4a3b22';
        ctx.beginPath();
        ctx.ellipse(220, canvasHeight * 0.72, 210, 95, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Atmospheric lighting & dust motes
    ctx.save();
    if (curScene >= 2) {
      const lampX = canvasWidth * 0.516;
      const lampY = canvasHeight * 0.495;
      const pulse = 1 + Math.sin(renderState.elapsedTime * 8.5) * 0.07;
      const glowR = Math.max(10, 155 * pulse);
      const lampGlow = ctx.createRadialGradient(
        lampX,
        lampY,
        4,
        lampX,
        lampY,
        glowR,
      );
      lampGlow.addColorStop(0, THEME.colors.lampGlowInner);
      lampGlow.addColorStop(1, THEME.colors.lampGlowOuter);
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(lampX, lampY, glowR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const shaftGrad = ctx.createLinearGradient(
        canvasWidth * 0.76,
        canvasHeight * 0.18,
        canvasWidth * 0.42,
        canvasHeight * 0.78,
      );
      shaftGrad.addColorStop(0, THEME.colors.lightShaftTop);
      shaftGrad.addColorStop(1, THEME.colors.lightShaftBottom);
      ctx.fillStyle = shaftGrad;
      ctx.beginPath();
      ctx.moveTo(canvasWidth * 0.68, canvasHeight * 0.24);
      ctx.lineTo(canvasWidth * 0.8, canvasHeight * 0.24);
      ctx.lineTo(canvasWidth * 0.62, canvasHeight * 0.8);
      ctx.lineTo(canvasWidth * 0.36, canvasHeight * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    for (let i = 0; i < renderState.dust.length; i++) {
      const p = renderState.dust[i];
      if (!p) continue;
      ctx.globalAlpha = clamp(p.alpha, 0, 1);
      ctx.fillStyle = THEME.colors.dustMote;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Dark vignette over `nencanh2` during Scene 3 Phase 1 ('dialogue') so Liên + Dialogue Box + Dó paper pop crisply
    if (curScene === 3 && s3Phase === 'dialogue') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    const shouldShowDialogueLayers =
      curScene === 1 ||
      (curScene === 2 && s2Phase !== 'STEP1_MENU') ||
      (curScene === 3 && s3Phase === 'dialogue');

    if (!shouldShowDialogueLayers) {
      return;
    }

    // LAYER 2 (Middle - Nhân Vật): Character Portraits
    const lienImg = assets['sprite_lien_hoodie'];
    const lienTargetH = getConfig('assetLienHeight');
    const lienRatio =
      lienImg && lienImg.complete && lienImg.naturalHeight > 0
        ? lienImg.naturalWidth / lienImg.naturalHeight
        : getConfig('assetLienAspectRatio');
    const lienW = lienTargetH * lienRatio;
    const lienX = getConfig('lienTargetX');
    const lienY =
      getConfig('lienTargetY') +
      renderState.lienOffsetY +
      Math.sin(renderState.elapsedTime * 1.8) * 2.5;

    if (renderState.lienAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = clamp(renderState.lienAlpha, 0, 1);
      if ('filter' in ctx) {
        ctx.filter = `brightness(${clamp(renderState.lienBrightness, 0.15, 1.15)})`;
      }
      drawAsset(
        ctx,
        lienImg,
        lienX,
        lienY,
        lienW,
        lienTargetH,
        (fallbackCtx) => {
          fallbackCtx.fillStyle = THEME.colors.jadeAccent;
          fallbackCtx.beginPath();
          fallbackCtx.arc(
            lienX + lienW * 0.5,
            lienY + lienTargetH * 0.28,
            Math.max(10, lienW * 0.22),
            0,
            Math.PI * 2,
          );
          fallbackCtx.fill();
          fallbackCtx.fillRect(
            lienX + lienW * 0.22,
            lienY + lienTargetH * 0.48,
            lienW * 0.56,
            lienTargetH * 0.48,
          );
        },
      );
      ctx.restore();
    }

    // STRICT SCENE 1 ONLY: Quản gia Lâm is completely unmounted / never rendered in Scene 2+
    if (curScene === 1 && renderState.quanGiaAlpha > 0.01) {
      const quanGiaImg = assets['sprite_quan_gia_lam'];
      const quanGiaTargetH = getConfig('assetQuanGiaHeight');
      const quanGiaRatio =
        quanGiaImg && quanGiaImg.complete && quanGiaImg.naturalHeight > 0
          ? quanGiaImg.naturalWidth / quanGiaImg.naturalHeight
          : getConfig('assetQuanGiaAspectRatio');
      const quanGiaW = quanGiaTargetH * quanGiaRatio;
      const quanGiaX = getConfig('quanGiaTargetX');
      const quanGiaY = getConfig('quanGiaTargetY') + renderState.quanGiaOffsetY;

      ctx.save();
      ctx.globalAlpha = clamp(renderState.quanGiaAlpha, 0, 1);
      if ('filter' in ctx) {
        ctx.filter = `brightness(${clamp(renderState.quanGiaBrightness, 0.15, 1.15)})`;
      }
      ctx.translate(quanGiaX + quanGiaW / 2, quanGiaY);
      ctx.scale(-1, 1);
      drawAsset(
        ctx,
        quanGiaImg,
        -quanGiaW / 2,
        0,
        quanGiaW,
        quanGiaTargetH,
        (fallbackCtx) => {
          fallbackCtx.fillStyle = THEME.colors.speakerQuanGiaBadge;
          fallbackCtx.beginPath();
          fallbackCtx.arc(
            0,
            quanGiaTargetH * 0.25,
            Math.max(10, quanGiaW * 0.22),
            0,
            Math.PI * 2,
          );
          fallbackCtx.fill();
          fallbackCtx.fillRect(
            -quanGiaW * 0.28,
            quanGiaTargetH * 0.45,
            quanGiaW * 0.56,
            quanGiaTargetH * 0.52,
          );
        },
      );
      ctx.restore();
    }

    // LAYER 3 (Front UI - Khung Thoại)
    const boxImg = assets['dialogue_box_frame'];
    const boxW = getConfig('assetDialogueBoxWidth');
    const boxH = getConfig('assetDialogueBoxHeight');
    const boxX = (canvasWidth - boxW) / 2 + renderState.shakeOffsetX;
    const boxY =
      canvasHeight -
      boxH -
      getConfig('dialogueBoxBottomMargin') +
      renderState.shakeOffsetY;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.fillRect(boxX + 6, boxY + 8, boxW - 12, boxH - 6);

    drawAsset(ctx, boxImg, boxX, boxY, boxW, boxH, (fallbackCtx) => {
      fallbackCtx.fillStyle = THEME.colors.ebonyPanel;
      fallbackCtx.strokeStyle = THEME.colors.gildedGold;
      fallbackCtx.lineWidth = 3;
      fallbackCtx.fillRect(boxX, boxY, boxW, boxH);
      fallbackCtx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);
    });
    ctx.restore();
  };

  // --- Ref-Cached Game Loop ---
  const updateRef = useRef(update);
  const drawRef = useRef(draw);
  updateRef.current = update;
  drawRef.current = draw;

  const activeBadgeDetailRef = useRef(activeBadgeDetail);
  activeBadgeDetailRef.current = activeBadgeDetail;
  const activeHintModalTextRef = useRef(activeHintModalText);
  activeHintModalTextRef.current = activeHintModalText;
  const isQuizModalOpenRef = useRef(isQuizModalOpen);
  isQuizModalOpenRef.current = isQuizModalOpen;
  const isHintOverlayOpenRef = useRef(isHintOverlayOpen);
  isHintOverlayOpenRef.current = isHintOverlayOpen;
  const isCollectionOverlayOpenRef = useRef(isCollectionOverlayOpen);
  isCollectionOverlayOpenRef.current = isCollectionOverlayOpen;
  const isGameMenuOpenRef = useRef(isGameMenuOpen);
  isGameMenuOpenRef.current = isGameMenuOpen;
  const isHowToPlayOpenRef = useRef(isHowToPlayOpen);
  isHowToPlayOpenRef.current = isHowToPlayOpen;
  const isRewardPopupOpenRef = useRef(isRewardPopupOpen);
  isRewardPopupOpenRef.current = isRewardPopupOpen;

  useEffect(() => {
    let raf = 0;
    const loop = (time: number) => {
      if (inputRef.current) {
        const cancelPressed = inputRef.current.actions.cancel;
        if (cancelPressed && !lastCancelRef.current) {
          const currentStatus = gameStateRef.current.status;
          // Close topmost modal respecting Z-Index Hierarchy (70 -> 60 -> 50 -> 45)
          if (activeBadgeDetailRef.current) {
            setActiveBadgeDetail(null);
          } else if (activeHintModalTextRef.current !== null) {
            setActiveHintModalText(null);
          } else if (isQuizModalOpenRef.current) {
            setIsQuizModalOpen(false);
          } else if (isHowToPlayOpenRef.current) {
            setIsHowToPlayOpen(false);
          } else if (isHintOverlayOpenRef.current) {
            setIsHintOverlayOpen(false);
            setHintOverlayView('MAIN');
          } else if (isCollectionOverlayOpenRef.current) {
            setIsCollectionOverlayOpen(false);
          } else if (isGameMenuOpenRef.current) {
            setIsGameMenuOpen(false);
          } else if (
            currentStatus === 'PLAYING' &&
            !isRewardPopupOpenRef.current &&
            !(
              activeSceneRef.current === 3 &&
              scene3PhaseRef.current === 'explanation'
            )
          ) {
            setIsGameMenuOpen(true);
          } else if (currentStatus === 'PAUSED') {
            setGameState((prev) => ({...prev, status: 'PLAYING'}));
          } else if (
            ['GAME_OVER', 'VICTORY', 'LEVEL_COMPLETE'].includes(currentStatus)
          ) {
            setGameState((prev) => ({...prev, status: 'START'}));
          }
        }
        lastCancelRef.current = cancelPressed;
      }

      stepperRef.current?.(time, (dt) => updateRef.current(dt));

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawRef.current(ctx);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isMusicPlaying =
    gameState.status === 'PLAYING' && !isGameMenuOpen && !isHowToPlayOpen;

  // Offline procedural ambient courtyard notes via gameAudio.playTone
  useEffect(() => {
    if (!isMusicPlaying || isMusicMuted) return;
    const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
    const pattern = [0, 2, 3, 4, 3, 1, 2, 5];
    let step = 0;
    const id = window.setInterval(() => {
      const idx = pattern[step % pattern.length] ?? 0;
      step += 1;
      const freq = scale[idx] ?? 293.66;
      gameAudio.playTone({
        type: 'sine',
        freq,
        dur: 0.9,
        gain: 0.025,
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [isMusicPlaying, isMusicMuted]);

  const activeInspectionObj = activeInspectionId
    ? SCENE_2_INSPECTIONS.find((item) => item.id === activeInspectionId)
    : undefined;

  const currentRenderedLine: DialogueLine =
    activeScene === 1
      ? SCENE_1_SCRIPT[currentLineIndex] ?? SCENE_1_SCRIPT[0]
      : activeScene === 3
        ? SCENE_3_DIALOGUE_SCRIPT[scene3DialogueIndex] ??
          SCENE_3_DIALOGUE_SCRIPT[0]
        : scene2Phase === 'STEP1_INSPECT' && activeInspectionObj
          ? {
              id: 100,
              speaker: activeInspectionObj.speaker,
              spriteId: 'sprite_lien_hoodie',
              action: activeInspectionObj.action,
              dialogue: activeInspectionObj.dialogue,
            }
          : scene2Phase === 'STEP2_SHUDDER'
            ? SCENE_2_SHUDDER_LINE
            : SCENE_2_DO_PAPER_LINE;

  const isDialogueBoxOpen =
    gameState.status === 'PLAYING' &&
    (activeScene === 1 ||
      (activeScene === 2 && scene2Phase !== 'STEP1_MENU') ||
      (activeScene === 3 && scene3Phase === 'dialogue'));

  const actionStr = currentRenderedLine.action;
  const dialogueStr = currentRenderedLine.dialogue;
  const shownAction = actionStr.slice(
    0,
    Math.min(revealedChars, actionStr.length),
  );
  const shownDialogue =
    revealedChars > actionStr.length
      ? dialogueStr.slice(0, Math.max(0, revealedChars - actionStr.length - 1))
      : '';

  const boxWidthPct = (getConfig('assetDialogueBoxWidth') / canvasWidth) * 100;
  const boxHeightPct =
    (getConfig('assetDialogueBoxHeight') / canvasHeight) * 100;
  const boxLeftPct = (100 - boxWidthPct) / 2;
  const boxBottomPct =
    (getConfig('dialogueBoxBottomMargin') / canvasHeight) * 100;

  const isAssetLoaded = (key: string): boolean =>
    Boolean(
      assets[key] &&
        assets[key]?.complete &&
        (assets[key]?.naturalWidth ?? 0) > 0,
    );

  const menuBgLoaded = isAssetLoaded('menu_background');
  const menuBtnLoaded = isAssetLoaded('menu_button_sprite');
  const giayDoLoaded = isAssetLoaded('giaydo_baive');
  const iconGoiYLoaded = isAssetLoaded('icon_goiy');
  const iconBoSuuTapLoaded = isAssetLoaded('icon_bosuutap');
  const nenPopupLoaded = isAssetLoaded('nen_popup');
  const huyHieuBiaTienSiLoaded = isAssetLoaded('huyhieu_biatiensi');

  const menuButtonAspectRatio = getConfig('assetMenuButtonAspectRatio');

  const remainingScene2Choices = SCENE_2_INSPECTIONS.filter(
    (item) => !checkedChoices.includes(item.id),
  );

  const darkRedButtonStyle: React.CSSProperties = {
    background: `linear-gradient(180deg, ${THEME.colors.darkRedBtnTop} 0%, ${THEME.colors.darkRedBtnBottom} 100%)`,
    borderColor: THEME.colors.darkRedBtnBorder,
    color: THEME.colors.darkRedBtnText,
    boxShadow:
      '0 10px 28px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 218, 158, 0.25)',
  };

  const currentQuizQuestion = quizQuestions[quizStepIndex];

  const isScene3PuzzleOverlayVisible =
    gameState.status === 'PLAYING' &&
    activeScene === 3 &&
    scene3Phase === 'puzzle' &&
    isDoPaperOpen;

  const isTopCenterPuzzlePromptVisible =
    gameState.status === 'PLAYING' &&
    activeScene === 3 &&
    scene3Phase === 'puzzle';

  return (
    <div
      style={{
        backgroundColor: getConfig('backgroundColor'),
        fontFamily: THEME.fonts.body,
      }}
      className="fixed inset-0 w-screen h-screen overflow-hidden touch-none flex flex-col items-center justify-center text-stone-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Noto+Serif:ital,wght@0,600;0,700;0,900;1,400;1,600;1,700&display=swap');
        .vn-poem-container {
          container-type: inline-size;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          mix-blend-mode: normal !important;
          opacity: 1 !important;
        }
        .vn-poem-container p,
        .vn-poem-container .vn-poem-line,
        .vn-poem-container * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          text-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          mix-blend-mode: normal !important;
          opacity: 1 !important;
          font-family: 'Noto Serif', 'Playfair Display', Georgia, serif;
          font-weight: 700;
          font-style: italic;
          letter-spacing: -0.012em;
          line-height: 1.58;
          font-size: clamp(14px, 2.45vh, 25px);
          font-size: 4.6cqi;
        }
        .vn-poem-container.is-phase1-compact p,
        .vn-poem-container.is-phase1-compact .vn-poem-line {
          font-size: clamp(11.5px, 1.85vh, 18.5px);
          font-size: 4.6cqi;
        }
        @keyframes vnBlinkArrow {
          0%, 100% { transform: translateY(0px); opacity: 1; }
          50% { transform: translateY(4px); opacity: 0.45; }
        }
        .vn-arrow-blink {
          animation: vnBlinkArrow 1.15s ease-in-out infinite;
        }
        @keyframes vnSceneShudderShake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          10% { transform: translate3d(-9px, -4px, 0); }
          20% { transform: translate3d(9px, 4px, 0); }
          30% { transform: translate3d(-8px, 3px, 0); }
          40% { transform: translate3d(8px, -3px, 0); }
          50% { transform: translate3d(-6px, 2px, 0); }
          65% { transform: translate3d(6px, -2px, 0); }
          80% { transform: translate3d(-3px, 1px, 0); }
          92% { transform: translate3d(2px, -1px, 0); }
        }
        .vn-scene-shudder {
          animation: vnSceneShudderShake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes vnPasscodeErrorShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-7px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .vn-passcode-shake {
          animation: vnPasscodeErrorShake 0.44s ease-in-out both;
        }
      `}</style>

      {!assetsReady && (
        <div
          style={{backgroundColor: THEME.colors.canvasFallbackBg}}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center text-amber-200">
          <div
            style={{fontFamily: THEME.fonts.heading}}
            className="text-2xl font-bold tracking-wide mb-2">
            {'Hậu Lê Phiêu Lưu Ký '}
          </div>
          <div className="text-sm text-stone-400">Đang tải tài nguyên...</div>
        </div>
      )}

      <BackgroundMusic
        url=""
        isPlaying={isMusicPlaying}
        isMuted={isMusicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* Dedicated Top HUD Bar during Gameplay (z-index: 30 so Top-Right HUD & Top-Center Puzzle Prompt sit cleanly above stage) */}
      {assetsReady && gameState.status === 'PLAYING' && (
        <div
          style={{backgroundColor: THEME.colors.canvasFallbackBg, zIndex: 30}}
          className="w-full min-h-[62px] flex flex-wrap items-center justify-between px-8 py-1.5 border-b border-amber-900/30 shrink-0 gap-2.5">
          {/* Left: Top-Left Menu Button + Scene Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            <TouchSafeButton
              testId="top-left-menu-button"
              onClick={() => {
                gameAudio.playCrispClick();
                setIsGameMenuOpen((prev) => !prev);
              }}
              ariaLabel="Mở Menu Trò Chơi"
              style={{backgroundColor: THEME.colors.ebonyButtonBg}}
              className="px-4 py-2 rounded-lg border border-amber-700/60 text-amber-200 text-xs sm:text-sm font-bold flex items-center justify-center shadow-md">
              <span>Menu</span>
            </TouchSafeButton>

            {!isTopCenterPuzzlePromptVisible && (
              <div className="flex items-center gap-2 text-xs text-amber-200/85 pointer-events-none select-none">
                <span className="font-semibold text-amber-300">
                  {activeScene === 1
                    ? 'Cảnh 1'
                    : activeScene === 2
                      ? 'Cảnh 2'
                      : activeScene === 3
                        ? 'Cảnh 3'
                        : 'Cảnh 4'}
                </span>
                <span className="text-stone-500 hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  {activeScene === 1
                    ? `Thoại ${currentLineIndex + 1}/${SCENE_1_SCRIPT.length}`
                    : activeScene === 2
                      ? scene2Phase === 'STEP1_MENU' ||
                        scene2Phase === 'STEP1_INSPECT'
                        ? `Khám phá kho (${checkedChoices.length}/${SCENE_2_INSPECTIONS.length})`
                        : 'Phát hiện vật lạ'
                      : activeScene === 3
                        ? scene3Phase === 'dialogue'
                          ? `Đọc tờ giấy dó (${scene3DialogueIndex + 1}/${SCENE_3_DIALOGUE_SCRIPT.length})`
                          : 'Giải mã bài vè cổ'
                        : 'Chuẩn bị hành trình mới'}
                </span>
              </div>
            )}
          </div>

          {/* VERY TOP-CENTER PUZZLE PROMPT (Scene 3 Phase 2: centered cleanly between Top-Left Menu and Top-Right HUD) */}
          {isTopCenterPuzzlePromptVisible && (
            <div
              data-testid="scene3-top-puzzle-prompt"
              className="order-3 md:order-none w-full md:w-auto md:flex-1 flex items-center justify-center px-1">
              <div
                style={{
                  backgroundColor: 'rgba(10, 6, 4, 0.88)',
                  borderColor: 'rgba(255, 59, 59, 0.5)',
                  color: '#FF3B3B',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.82)',
                }}
                className="px-4 py-1.5 rounded-full border font-bold text-xs sm:text-sm lg:text-base text-center leading-snug">
                {SCENE_3_PUZZLE_PROMPT}
              </div>
            </div>
          )}

          {/* TOP-RIGHT HUD BAR (Unlocks from Scene 3 onwards; strictly hidden on Start, Scene 1 & Scene 2) */}
          {hudUnlocked && activeScene >= 3 && (
            <div
              data-testid="scene3-topright-hud"
              className="flex items-center gap-2.5 shrink-0">
              {/* Button 1: icon_goiy + "Gợi ý" */}
              <TouchSafeButton
                testId="hud-hint-button"
                ariaLabel="Gợi ý"
                onClick={handleOpenHintOverlay}
                style={{backgroundColor: 'rgba(43, 28, 20, 0.9)'}}
                className="w-[74px] h-[54px] px-2 py-1 rounded-xl border border-amber-600/65 flex flex-col items-center justify-center gap-0.5 shadow-lg">
                <div className="w-7 h-7 flex items-center justify-center overflow-hidden shrink-0">
                  {iconGoiYLoaded ? (
                    <img
                      src={ASSETS_MANIFEST.icon_goiy}
                      alt="Gợi ý"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 48 48"
                      className="w-full h-full object-contain"
                      aria-hidden="true">
                      <path
                        d="M24 6 C29 14 29 20 24 24 C19 20 19 14 24 6 Z"
                        fill="#ffd56b"
                      />
                      <ellipse cx="24" cy="34" rx="16" ry="7" fill="#c89b4f" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] leading-none font-bold text-amber-100 whitespace-nowrap">
                  Gợi ý
                </span>
              </TouchSafeButton>

              {/* Button 2: icon_bosuutap + "Bộ sưu tập" */}
              <TouchSafeButton
                testId="hud-collection-button"
                ariaLabel="Bộ sưu tập"
                onClick={handleOpenCollectionOverlay}
                style={{backgroundColor: 'rgba(43, 28, 20, 0.9)'}}
                className="w-[74px] h-[54px] px-1.5 py-1 rounded-xl border border-amber-600/65 flex flex-col items-center justify-center gap-0.5 shadow-lg">
                <div className="w-8 h-7 flex items-center justify-center overflow-hidden shrink-0">
                  {iconBoSuuTapLoaded ? (
                    <img
                      src={ASSETS_MANIFEST.icon_bosuutap}
                      alt="Bộ sưu tập"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 56 40"
                      className="w-full h-full object-contain"
                      aria-hidden="true">
                      <rect
                        x="6"
                        y="10"
                        width="34"
                        height="22"
                        rx="3"
                        fill="#8B1E1E"
                        stroke="#D4AF37"
                        strokeWidth="2.5"
                      />
                      <rect
                        x="34"
                        y="22"
                        width="16"
                        height="8"
                        rx="3"
                        fill="#e2b866"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] leading-none font-bold text-amber-100 whitespace-nowrap">
                  Bộ sưu tập
                </span>
              </TouchSafeButton>
            </div>
          )}
        </div>
      )}

      {/* Main 16:9 Stage Area */}
      {assetsReady && (
        <div
          style={{backgroundColor: THEME.colors.canvasFallbackBg}}
          className={`flex-1 w-full min-h-0 flex items-center justify-center relative ${
            isSceneShaking ? 'vn-scene-shudder' : ''
          }`}>
          <div
            style={{
              aspectRatio: `${canvasWidth} / ${canvasHeight}`,
              width:
                gameState.status === 'PLAYING'
                  ? `min(100%, calc((100vh - ${
                      isScene3PuzzleOverlayVisible ? 74 : 128
                    }px) * ${canvasWidth} / ${canvasHeight}))`
                  : `min(100%, calc(100vh * ${canvasWidth} / ${canvasHeight}))`,
            }}
            className="relative h-auto max-w-full max-h-full flex items-center justify-center overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              style={{
                aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              className="block w-full h-full"
            />

            {/* Explicit character DOM markers strictly enforcing `display: none` when unused */}
            <div
              data-character="sprite_quan_gia_lam"
              style={{
                display:
                  gameState.status === 'PLAYING' &&
                  activeScene === 1 &&
                  currentLineIndex >= 3
                    ? 'block'
                    : 'none',
              }}
              className="pointer-events-none"
            />
            <div
              data-character="sprite_lien_hoodie"
              style={{
                display: isDialogueBoxOpen ? 'block' : 'none',
              }}
              className="pointer-events-none"
            />

            {/* SCENE 3 PHASE 1 ('dialogue'): Center Dó Paper positioned cleanly above bottom Dialogue Box */}
            {gameState.status === 'PLAYING' &&
              activeScene === 3 &&
              scene3Phase === 'dialogue' && (
                <div
                  data-testid="scene3-phase1-paper"
                  style={{
                    position: 'absolute',
                    top: '0.5%',
                    height: '58.5%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 8,
                  }}
                  className="flex items-center justify-center pointer-events-none select-none">
                  <DoPaperPoemCard
                    giayDoLoaded={giayDoLoaded}
                    imgSrc={ASSETS_MANIFEST.giaydo_baive}
                    compactForDialogue
                  />
                </div>
              )}

            {/* LAYER 4 VIETNAMESE DIALOGUE TEXT OVERLAY (Scene 1, Scene 2 Dialogue States, & Scene 3 Phase 1) */}
            {isDialogueBoxOpen && (
              <div
                onPointerUp={(e) => {
                  if (e.button !== undefined && e.button !== 0) return;
                  handleAdvanceDialogue();
                }}
                className="absolute inset-0 z-10 pointer-events-auto touch-none select-none">
                <div
                  style={{
                    position: 'absolute',
                    left: `${boxLeftPct}%`,
                    width: `${boxWidthPct}%`,
                    bottom: `${boxBottomPct}%`,
                    height: `${boxHeightPct}%`,
                    transform: `translate(${dialogueShakeOffset.x * 0.35}px, ${dialogueShakeOffset.y * 0.35}px)`,
                  }}
                  className="px-[7.5%] py-[4.2%] sm:py-[4.6%] flex flex-col justify-between pointer-events-none">
                  <div className="flex items-center justify-between gap-2 shrink-0 mb-1">
                    <div
                      style={{
                        backgroundColor:
                          activeScene === 1 &&
                          currentRenderedLine.spriteId === 'sprite_quan_gia_lam'
                            ? THEME.colors.speakerQuanGiaBadge
                            : THEME.colors.speakerLienBadge,
                        borderColor: THEME.colors.gildedGold,
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      }}
                      className="inline-flex items-center px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-md border text-[11px] sm:text-xs md:text-sm font-bold text-amber-200 tracking-wide shadow">
                      {currentRenderedLine.speaker}
                    </div>

                    {!isMobile && !isLineComplete && (
                      <span className="text-[10px] sm:text-xs text-stone-400/80 hidden sm:inline">
                        Nhấp chuột / Space để hiện hết
                      </span>
                    )}
                    {!isMobile &&
                      isLineComplete &&
                      ((activeScene === 1 &&
                        currentLineIndex < SCENE_1_SCRIPT.length - 1) ||
                        (activeScene === 3 && scene3Phase === 'dialogue')) && (
                        <span className="text-[10px] sm:text-xs text-stone-400/80 hidden sm:inline">
                          Nhấp chuột / Space để tiếp tục
                        </span>
                      )}
                  </div>

                  <div
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      handleAdvanceDialogue();
                    }}
                    className="flex-1 min-h-0 overflow-y-auto touch-auto pointer-events-auto pr-1 flex flex-col justify-center">
                    <p
                      style={{
                        textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
                      }}
                      className="text-[11px] sm:text-[13px] md:text-[15px] lg:text-[17px] leading-relaxed font-normal">
                      <span
                        style={{color: THEME.colors.stageActionText}}
                        className="italic font-medium mr-1.5">
                        {shownAction}
                      </span>
                      {shownDialogue && (
                        <span
                          style={{color: THEME.colors.dialogueText}}
                          className="font-medium">
                          {shownDialogue}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-end shrink-0 mt-0.5 min-h-[18px]">
                    {!isMobile &&
                      isLineComplete &&
                      ((activeScene === 1 &&
                        currentLineIndex < SCENE_1_SCRIPT.length - 1) ||
                        (activeScene === 3 && scene3Phase === 'dialogue')) && (
                        <div
                          aria-hidden="true"
                          className="vn-arrow-blink flex items-center gap-1 text-amber-300 text-xs sm:text-sm font-bold px-2">
                          <span>▼</span>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SCENE 2 - STEP 1: VERTICALLY CENTERED DARK RED CHOICE MENU */}
          {gameState.status === 'PLAYING' &&
            activeScene === 2 &&
            scene2Phase === 'STEP1_MENU' && (
              <div
                ref={step1MenuRef}
                data-overlay-container=""
                className="absolute inset-0 z-20 overflow-y-auto touch-auto">
                <div className="min-h-full w-full flex flex-col items-center px-8 py-4">
                  <div className="m-auto w-full max-w-xl flex flex-col items-center gap-3.5">
                    {remainingScene2Choices.map((item, idx) => (
                      <TouchSafeButton
                        key={item.id}
                        autoFocus={idx === 0}
                        testId={`scene2-choice-${item.id}`}
                        onClick={() => handleSelectScene2Inspection(item.id)}
                        style={darkRedButtonStyle}
                        className="w-full py-3.5 px-6 rounded-xl border-2 text-left sm:text-center font-bold text-xs sm:text-sm md:text-base flex items-center justify-center shadow-2xl">
                        <span
                          style={{textShadow: '0 2px 5px rgba(0, 0, 0, 0.92)'}}
                          className="leading-snug">
                          {item.buttonLabel}
                        </span>
                      </TouchSafeButton>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* SCENE 3 PHASE 2 ('puzzle'): DARK VIGNETTE + ANTIQUE DÓ PAPER (#000000 POEM) + 4-DIGIT INPUT */}
          {isScene3PuzzleOverlayVisible && (
            <div
              data-testid="scene3-paper-overlay"
              style={{backgroundColor: 'rgba(0, 0, 0, 0.78)', zIndex: 20}}
              className="absolute inset-0 overflow-y-auto touch-auto">
              <div className="min-h-full w-full flex flex-col items-center px-6 py-1.5 sm:py-2">
                <div className="m-auto w-full max-w-2xl flex flex-col items-center gap-2">
                  <DoPaperPoemCard
                    giayDoLoaded={giayDoLoaded}
                    imgSrc={ASSETS_MANIFEST.giaydo_baive}
                  />

                  {/* Passcode Input + "Xác nhận" + "Cất" Controls */}
                  <div
                    className={`w-full flex flex-wrap items-center justify-center gap-2.5 ${
                      isPasscodeShaking ? 'vn-passcode-shake' : ''
                    }`}>
                    <input
                      ref={passcodeInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={passcodeInput}
                      placeholder="Nhập 4 số"
                      aria-label="Mật mã 4 chữ số"
                      data-testid="scene3-passcode-input"
                      onChange={(e) => {
                        const digitsOnly = e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4);
                        setPasscodeInput(digitsOnly);
                        if (passcodeError) setPasscodeError('');
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitScene3Passcode();
                        }
                      }}
                      style={{
                        backgroundColor: '#1a110d',
                        borderColor: THEME.colors.gildedGold,
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                      }}
                      className="w-[144px] min-h-[48px] px-4 py-2 rounded-xl border-2 text-center text-lg font-bold tracking-[0.25em] text-amber-100 placeholder:text-stone-500 placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-300 pointer-events-auto touch-auto shadow-xl"
                    />

                    <TouchSafeButton
                      testId="scene3-confirm-passcode"
                      onClick={handleSubmitScene3Passcode}
                      style={{
                        backgroundColor: THEME.colors.gildedActionBg,
                        borderColor: THEME.colors.gildedGoldBright,
                        color: THEME.colors.ebonyPanel,
                      }}
                      className="px-5 py-2.5 rounded-xl border-2 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                      <span>{SCENE_3_CONFIRM_LABEL}</span>
                    </TouchSafeButton>

                    <TouchSafeButton
                      testId="scene3-put-away-button"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setIsDoPaperOpen(false);
                      }}
                      style={{
                        backgroundColor: THEME.colors.ebonyButtonBg,
                        borderColor: THEME.colors.gildedBorder,
                      }}
                      className="px-5 py-2.5 rounded-xl border-2 text-amber-100 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                      <span>{SCENE_3_PUT_AWAY_LABEL}</span>
                    </TouchSafeButton>
                  </div>

                  {passcodeError && (
                    <p
                      role="alert"
                      className="text-xs sm:text-sm font-semibold text-red-300 bg-black/75 px-3.5 py-1 rounded-lg border border-red-800/60 text-center">
                      {passcodeError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SCENE 4 PREPARATION PLACEHOLDER ("Chuyển sang Cảnh 4") */}
          {gameState.status === 'PLAYING' && activeScene === 4 && (
            <div
              data-testid="scene4-placeholder"
              style={{backgroundColor: 'rgba(0, 0, 0, 0.76)', zIndex: 25}}
              className="absolute inset-0 overflow-y-auto touch-auto">
              <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
                <div
                  style={{
                    backgroundColor: THEME.colors.ebonyPanel,
                    borderColor: THEME.colors.gildedActionBg,
                  }}
                  className="m-auto w-full max-w-md flex flex-col items-center border-2 rounded-xl p-6 sm:p-8 shadow-2xl text-center">
                  <div className="px-3 py-1 rounded-full bg-amber-900/50 border border-amber-500/50 text-amber-300 text-xs font-semibold mb-3">
                    Hoàn thành Cảnh 3
                  </div>

                  <h1
                    style={{
                      fontFamily: THEME.fonts.heading,
                      color: THEME.colors.gildedGoldBright,
                    }}
                    className="text-3xl sm:text-4xl font-black mb-3">
                    Chuyển sang Cảnh 4
                  </h1>

                  <p className="text-stone-200 text-sm sm:text-base leading-relaxed mb-6">
                    Bí ẩn niên đại Hồng Đức năm thứ 15 (1484) đã được khai mở!
                    Huy hiệu <strong>Bia Tiến Sĩ Khoa Nhâm Tuất</strong> đã nằm
                    gọn trong Bộ sưu tập. Hành trình tìm kiếm ba Ấn Tín sẽ tiếp
                    tục trong Cảnh 4!
                  </p>

                  <div className="w-full flex flex-col gap-3">
                    <TouchSafeButton
                      autoFocus
                      testId="scene4-return-start"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        closeAllSubModals();
                        setGameState((prev) => ({...prev, status: 'START'}));
                      }}
                      style={{
                        backgroundColor: THEME.colors.gildedActionBg,
                        color: THEME.colors.ebonyPanel,
                      }}
                      className="w-full py-3 px-6 rounded-lg font-bold text-base sm:text-lg flex items-center justify-center shadow-lg">
                      <span>Quay về Màn hình Bắt đầu</span>
                    </TouchSafeButton>

                    <TouchSafeButton
                      onClick={resetGame}
                      style={{backgroundColor: THEME.colors.ebonyButtonBg}}
                      className="w-full py-3 px-6 rounded-lg border border-amber-700/60 text-amber-100 font-semibold text-base flex items-center justify-center">
                      <span>Chơi lại từ Cảnh 1</span>
                    </TouchSafeButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEDICATED BOTTOM ACTION BAR */}
      {assetsReady &&
        gameState.status === 'PLAYING' &&
        !isScene3PuzzleOverlayVisible &&
        !(
          activeScene === 3 &&
          (scene3Phase === 'explanation' || scene3Phase === 'reward')
        ) &&
        activeScene !== 4 && (
          <div
            style={{backgroundColor: THEME.colors.canvasFallbackBg}}
            className="w-full min-h-[64px] px-8 py-2 border-t border-amber-900/30 z-20 shrink-0 flex items-center justify-center gap-3">
            {/* Scene 1: Final Choice Button (Plain text, NO sparkles) */}
            {activeScene === 1 && isChoiceVisible && (
              <TouchSafeButton
                buttonRef={bottomActionBtnRef}
                autoFocus
                testId="scene1-end-choice"
                onClick={handleSelectScene1Choice}
                style={{
                  backgroundColor: menuBtnLoaded
                    ? undefined
                    : THEME.colors.ebonyPanel,
                  borderColor: menuBtnLoaded
                    ? undefined
                    : THEME.colors.gildedGold,
                  backgroundImage: menuBtnLoaded
                    ? `url(${ASSETS_MANIFEST.menu_button_sprite})`
                    : undefined,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                }}
                className={`max-w-xl w-full sm:w-auto px-6 sm:px-10 py-2.5 rounded-xl flex items-center justify-center text-center shadow-xl ${
                  menuBtnLoaded ? 'bg-transparent' : 'border-2'
                }`}>
                <span
                  style={{textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)'}}
                  className="text-xs sm:text-sm md:text-base font-bold text-amber-100 leading-snug">
                  {SCENE_1_CHOICE_LABEL}
                </span>
              </TouchSafeButton>
            )}

            {/* Scene 1 & Scene 3 Phase 1: Mobile Continue / Reveal Button (Plain text) */}
            {((activeScene === 1 && !isChoiceVisible) ||
              (activeScene === 3 && scene3Phase === 'dialogue')) &&
              isMobile && (
                <TouchSafeButton
                  onClick={handleAdvanceDialogue}
                  ariaLabel="Tiếp tục thoại"
                  className="px-6 py-2.5 rounded-xl bg-amber-900/80 border border-amber-400/75 text-amber-100 text-xs sm:text-sm font-bold flex items-center justify-center shadow-lg">
                  <span>{isLineComplete ? 'Tiếp tục' : 'Hiện hết'}</span>
                </TouchSafeButton>
              )}

            {/* Scene 1 & Scene 3 Phase 1: Subtle Desktop Prompt */}
            {((activeScene === 1 && !isChoiceVisible) ||
              (activeScene === 3 && scene3Phase === 'dialogue')) &&
              !isMobile && (
                <span className="text-xs text-stone-400/75 select-none pointer-events-none">
                  {isLineComplete
                    ? 'Nhấn chuột trái hoặc phím Space / Enter để qua câu tiếp theo'
                    : 'Nhấn chuột trái hoặc phím Space / Enter để hiện toàn bộ câu thoại'}
                </span>
              )}

            {/* Scene 2 Step 1 Menu Hint */}
            {activeScene === 2 && scene2Phase === 'STEP1_MENU' && (
              <span className="text-xs text-amber-200/80 select-none pointer-events-none text-center">
                Chọn một điểm khả nghi trong kho để kiểm tra (
                {checkedChoices.length}/{SCENE_2_INSPECTIONS.length})
              </span>
            )}

            {/* Scene 2 Step 1 Inspection: "Quay lại" Button (Plain text) */}
            {activeScene === 2 && scene2Phase === 'STEP1_INSPECT' && (
              <TouchSafeButton
                buttonRef={bottomActionBtnRef}
                testId="scene2-back-button"
                onClick={handleScene2Back}
                style={{
                  backgroundColor: THEME.colors.ebonyButtonBg,
                  borderColor: THEME.colors.gildedGold,
                }}
                className="px-7 py-2.5 rounded-xl border-2 text-amber-100 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                <span>{SCENE_2_BACK_LABEL}</span>
              </TouchSafeButton>
            )}

            {/* Scene 2 Step 2 Shudder: Dark Red "(A) Kiểm tra túi trước áo hoodie" Button */}
            {activeScene === 2 && scene2Phase === 'STEP2_SHUDDER' && (
              <TouchSafeButton
                buttonRef={bottomActionBtnRef}
                testId="scene2-pocket-button"
                onClick={handleCheckHoodiePocket}
                style={darkRedButtonStyle}
                className="max-w-lg w-full sm:w-auto px-7 py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm md:text-base flex items-center justify-center shadow-xl">
                <span style={{textShadow: '0 2px 5px rgba(0, 0, 0, 0.92)'}}>
                  {SCENE_2_POCKET_BUTTON_LABEL}
                </span>
              </TouchSafeButton>
            )}

            {/* Scene 2 Step 2 Dó Paper: Final Transition Button "Đọc tờ giấy dó" (Plain text, NO sparkles) */}
            {activeScene === 2 && scene2Phase === 'STEP2_PAPER' && (
              <TouchSafeButton
                buttonRef={bottomActionBtnRef}
                testId="scene2-read-paper-button"
                onClick={handleReadDoPaper}
                style={{
                  backgroundColor: THEME.colors.gildedActionBg,
                  borderColor: THEME.colors.gildedGoldBright,
                  color: THEME.colors.ebonyPanel,
                }}
                className="max-w-md w-full sm:w-auto px-8 py-2.5 rounded-xl border-2 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                <span>{SCENE_2_READ_PAPER_LABEL}</span>
              </TouchSafeButton>
            )}

            {/* Scene 3 Phase 2 Put-Away Mode: Clean `nencanh2` + "Mở tờ giấy" Button (Plain text, NO sparkles) */}
            {activeScene === 3 &&
              scene3Phase === 'puzzle' &&
              !isDoPaperOpen && (
                <TouchSafeButton
                  autoFocus
                  testId="scene3-reopen-paper-button"
                  onClick={() => {
                    gameAudio.playConfirmSelect();
                    setIsDoPaperOpen(true);
                  }}
                  style={{
                    backgroundColor: THEME.colors.gildedActionBg,
                    borderColor: THEME.colors.gildedGoldBright,
                    color: THEME.colors.ebonyPanel,
                  }}
                  className="px-8 py-2.5 rounded-xl border-2 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                  <span>{SCENE_3_REOPEN_PAPER_LABEL}</span>
                </TouchSafeButton>
              )}
          </div>
        )}

      {/* =====================================================================
       * SCENE 3 PHASE 3: HISTORICAL EXPLANATION MODAL (z-index: 40)
       * ===================================================================== */}
      {gameState.status === 'PLAYING' && isExplanationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Giải thích lịch sử 1484"
          data-overlay-container=""
          data-testid="scene3-explanation-modal"
          style={{zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.84)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
            <div
              style={{
                backgroundColor: '#050404',
                borderColor: THEME.colors.badgeGold,
                boxShadow:
                  '0 0 36px 14px rgba(0, 0, 0, 0.92), inset 0 0 18px rgba(212, 175, 55, 0.14)',
              }}
              className="m-auto w-full max-w-lg rounded-2xl border-2 p-6 sm:p-8 flex flex-col items-center text-center">
              <h2
                style={{
                  fontFamily: THEME.fonts.heading,
                  color: '#FFD700',
                }}
                className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
                {SCENE_3_EXPLANATION_TITLE}
              </h2>

              <p className="text-sm sm:text-base md:text-lg text-white leading-relaxed mb-6">
                {SCENE_3_EXPLANATION_BODY}
              </p>

              <TouchSafeButton
                autoFocus
                testId="scene3-claim-reward-button"
                onClick={handleClaimScene3Reward}
                style={{
                  backgroundColor: THEME.colors.gildedActionBg,
                  borderColor: THEME.colors.gildedGoldBright,
                  color: THEME.colors.ebonyPanel,
                }}
                className="w-full py-3 px-6 rounded-xl border-2 font-bold text-base sm:text-lg flex items-center justify-center shadow-xl">
                <span>{SCENE_3_CLAIM_REWARD_LABEL}</span>
              </TouchSafeButton>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * CELEBRATORY REWARD POPUP (z-index: 40)
       * ===================================================================== */}
      {isRewardPopupOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phần thưởng huy hiệu lịch sử"
          data-overlay-container=""
          data-testid="scene3-reward-popup"
          style={{zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.84)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
            <div
              style={{
                backgroundColor: THEME.colors.ebonyPanel,
                borderColor: THEME.colors.badgeGold,
              }}
              className="m-auto w-full max-w-md rounded-2xl border-2 p-6 sm:p-7 flex flex-col items-center text-center shadow-2xl">
              <HistoricalBadgeCard
                badge={BIA_TIEN_SI_BADGE}
                imgLoaded={huyHieuBiaTienSiLoaded}
                imgSrc={ASSETS_MANIFEST.huyhieu_biatiensi}
                onClick={() => {
                  gameAudio.playCrispClick();
                  setActiveBadgeDetail(BIA_TIEN_SI_BADGE);
                }}
              />

              <p className="mt-4 text-base sm:text-lg font-bold text-white">
                Đã được đặt trong Bộ sưu tập
              </p>

              <TouchSafeButton
                testId="reward-open-detail-link"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setActiveBadgeDetail(BIA_TIEN_SI_BADGE);
                }}
                className="mt-1 px-4 py-2 rounded-lg text-sm sm:text-base font-bold text-red-400 hover:text-red-300 underline underline-offset-4">
                <span>Ấn vào để xem chi tiết</span>
              </TouchSafeButton>

              <TouchSafeButton
                autoFocus
                testId="reward-continue-button"
                onClick={handleContinueToScene4}
                style={{
                  backgroundColor: THEME.colors.gildedActionBg,
                  borderColor: THEME.colors.gildedGoldBright,
                  color: THEME.colors.ebonyPanel,
                }}
                className="mt-4 w-full py-3 px-6 rounded-xl border-2 font-bold text-base sm:text-lg flex items-center justify-center shadow-xl">
                <span>Tiếp tục</span>
              </TouchSafeButton>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * HINT OVERLAY ("Gợi ý" on `nen_popup`, z-index: 50)
       * ===================================================================== */}
      {isHintOverlayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Giao diện Gợi ý"
          data-overlay-container=""
          data-testid="hint-overlay"
          style={{zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.78)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-4">
            <div
              style={{
                background: nenPopupLoaded
                  ? undefined
                  : 'linear-gradient(180deg, #3a1d12 0%, #221009 100%)',
                borderColor: THEME.colors.gildedBorder,
              }}
              className="m-auto relative w-full max-w-2xl min-h-[340px] sm:min-h-[390px] rounded-2xl border-2 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 sm:p-10">
              {nenPopupLoaded && (
                <img
                  src={ASSETS_MANIFEST.nen_popup}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
              <div
                style={{backgroundColor: 'rgba(18, 10, 7, 0.56)'}}
                className="absolute inset-0 pointer-events-none"
              />

              {/* Close "X" Button */}
              <TouchSafeButton
                testId="hint-overlay-close"
                ariaLabel="Đóng Gợi ý"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsHintOverlayOpen(false);
                  setHintOverlayView('MAIN');
                }}
                style={{
                  backgroundColor: 'rgba(26, 14, 9, 0.9)',
                  borderColor: THEME.colors.gildedGold,
                }}
                className="absolute top-3 right-3 z-20 w-12 h-12 rounded-xl border-2 text-amber-200 font-black text-lg flex items-center justify-center shadow-lg">
                <span>X</span>
              </TouchSafeButton>

              {hintOverlayView === 'MAIN' ? (
                <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-4 py-4">
                  <h2
                    style={{
                      fontFamily: THEME.fonts.heading,
                      color: THEME.colors.gildedGoldBright,
                      textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                    }}
                    className="text-2xl sm:text-3xl font-bold">
                    Gợi ý
                  </h2>

                  <p
                    data-testid="hint-candle-count"
                    style={{textShadow: '0 2px 6px rgba(0,0,0,0.95)'}}
                    className="text-base sm:text-lg font-bold text-amber-100">
                    {`Ngọn Nến Tri Thức hiện có: ${candleCount}`}
                  </p>

                  {isSceneHintsExhausted && (
                    <p
                      data-testid="hint-exhausted-msg"
                      className="text-sm sm:text-base font-semibold text-red-300 bg-black/65 px-4 py-2 rounded-lg border border-red-800/60">
                      {HINT_EXHAUSTED_MSG}
                    </p>
                  )}

                  <div className="w-full flex flex-col gap-3 mt-1">
                    <TouchSafeButton
                      testId="btn-xin-goi-y"
                      disabled={isSceneHintsExhausted}
                      onClick={handleRequestHintClick}
                      style={darkRedButtonStyle}
                      className="w-full py-3 px-6 rounded-xl border-2 font-bold text-base sm:text-lg flex items-center justify-center shadow-xl">
                      <span>Xin Gợi Ý</span>
                    </TouchSafeButton>

                    {currentSceneHintsUsed > 0 && (
                      <TouchSafeButton
                        testId="btn-review-unlocked-hints"
                        onClick={handleReviewUnlockedHints}
                        style={{
                          backgroundColor: THEME.colors.ebonyButtonBg,
                          borderColor: THEME.colors.gildedBorder,
                        }}
                        className="w-full py-2.5 px-5 rounded-xl border text-amber-200 font-semibold text-sm sm:text-base flex items-center justify-center shadow-md">
                        <span>Xem lại gợi ý đã mở</span>
                      </TouchSafeButton>
                    )}

                    <TouchSafeButton
                      testId="btn-tich-luy-nen"
                      onClick={handleOpenQuizFromHint}
                      style={{
                        backgroundColor: THEME.colors.gildedActionBg,
                        borderColor: THEME.colors.gildedGoldBright,
                        color: THEME.colors.ebonyPanel,
                      }}
                      className="w-full py-3 px-6 rounded-xl border-2 font-bold text-base sm:text-lg flex items-center justify-center shadow-xl">
                      <span>Tích lũy Nến Tri Thức</span>
                    </TouchSafeButton>
                  </div>
                </div>
              ) : (
                /* CONFIRMATION VIEW on `nen_popup`:
                 * Line 1: Non-clickable plain white text
                 * Line 2: Red text showing owned candles
                 * Line 3: Two side-by-side buttons ("Có" & "Quay lại")
                 */
                <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center gap-4 py-4">
                  <p
                    data-testid="confirm-hint-prompt-text"
                    style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)'}}
                    className="text-white font-bold text-base sm:text-xl leading-relaxed px-4 select-none">
                    {HINT_CONFIRM_PROMPT}
                  </p>

                  <p
                    data-testid="confirm-candle-owned"
                    style={{textShadow: '0 2px 6px rgba(0,0,0,0.95)'}}
                    className="text-sm sm:text-base font-bold text-red-400">
                    {`Số Nến Tri Thức đang sở hữu: ${candleCount}`}
                  </p>

                  {candleCount <= 0 && (
                    <p
                      data-testid="confirm-zero-candle-inline"
                      className="text-xs sm:text-sm font-semibold text-amber-200 bg-black/75 px-4 py-2 rounded-lg border border-amber-700/60">
                      Bạn hiện có 0 Nến Tri Thức. Hãy chọn &quot;Quay lại&quot;
                      rồi nhấn &quot;Tích lũy Nến Tri Thức&quot; để nhận thêm
                      nến!
                    </p>
                  )}

                  <div className="flex flex-row items-center justify-center gap-4 mt-2">
                    <TouchSafeButton
                      testId="btn-confirm-yes"
                      disabled={candleCount <= 0 || isSceneHintsExhausted}
                      onClick={handleConfirmSpendCandleForHint}
                      style={{
                        backgroundColor: THEME.colors.gildedActionBg,
                        borderColor: THEME.colors.gildedGoldBright,
                        color: THEME.colors.ebonyPanel,
                      }}
                      className="min-w-[128px] px-6 py-2.5 rounded-xl border-2 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                      <span>Có</span>
                    </TouchSafeButton>

                    <TouchSafeButton
                      testId="btn-confirm-back"
                      onClick={() => {
                        gameAudio.playCrispClick();
                        setHintOverlayView('MAIN');
                      }}
                      style={{
                        backgroundColor: THEME.colors.ebonyButtonBg,
                        borderColor: THEME.colors.gildedBorder,
                      }}
                      className="min-w-[128px] px-6 py-2.5 rounded-xl border-2 text-amber-100 font-bold text-sm sm:text-base flex items-center justify-center shadow-xl">
                      <span>Quay lại</span>
                    </TouchSafeButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * COLLECTION OVERLAY ("Bộ sưu tập" on `nen_popup`, z-index: 50)
       * ===================================================================== */}
      {isCollectionOverlayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bộ sưu tập huy hiệu"
          data-overlay-container=""
          data-testid="collection-overlay"
          style={{zIndex: 50, backgroundColor: 'rgba(0, 0, 0, 0.78)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-4">
            <div
              style={{
                background: nenPopupLoaded
                  ? undefined
                  : 'linear-gradient(180deg, #3a1d12 0%, #221009 100%)',
                borderColor: THEME.colors.gildedBorder,
              }}
              className="m-auto relative w-full max-w-2xl min-h-[360px] sm:min-h-[420px] rounded-2xl border-2 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 sm:p-10">
              {nenPopupLoaded && (
                <img
                  src={ASSETS_MANIFEST.nen_popup}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
              <div
                style={{backgroundColor: 'rgba(18, 10, 7, 0.5)'}}
                className="absolute inset-0 pointer-events-none"
              />

              {/* Close "X" Button */}
              <TouchSafeButton
                testId="collection-overlay-close"
                ariaLabel="Đóng Bộ sưu tập"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsCollectionOverlayOpen(false);
                }}
                style={{
                  backgroundColor: 'rgba(26, 14, 9, 0.9)',
                  borderColor: THEME.colors.gildedGold,
                }}
                className="absolute top-3 right-3 z-20 w-12 h-12 rounded-xl border-2 text-amber-200 font-black text-lg flex items-center justify-center shadow-lg">
                <span>X</span>
              </TouchSafeButton>

              <div className="relative z-10 w-full flex flex-col items-center text-center gap-4 py-2">
                <h2
                  style={{
                    fontFamily: THEME.fonts.heading,
                    color: THEME.colors.gildedGoldBright,
                    textShadow: '0 2px 8px rgba(0,0,0,0.95)',
                  }}
                  className="text-2xl sm:text-3xl font-bold">
                  Bộ sưu tập
                </h2>

                {unlockedBadges.length === 0 ? (
                  <div className="py-8 px-5 rounded-xl bg-black/55 border border-amber-800/45 max-w-md">
                    <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
                      Chưa có huy hiệu lịch sử nào được mở khóa. Hãy giải mã các
                      manh mối trong hành trình để thu thập huy hiệu!
                    </p>
                  </div>
                ) : (
                  <div className="w-full flex flex-wrap items-center justify-center gap-4 pt-1">
                    {COLLECTION_BADGES.filter((b) =>
                      unlockedBadges.includes(b.id),
                    ).map((badge) => (
                      <HistoricalBadgeCard
                        key={badge.id}
                        badge={badge}
                        imgLoaded={isAssetLoaded(badge.assetKey)}
                        imgSrc={
                          ASSETS_MANIFEST[badge.assetKey] ??
                          ASSETS_MANIFEST.huyhieu_biatiensi
                        }
                        onClick={() => {
                          gameAudio.playCrispClick();
                          setActiveBadgeDetail(badge);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * FEATHERED BLACK HINT DISPLAY MODAL (z-index: 70)
       * Strictly plain header `"Gợi ý"` — ZERO hint numbers!
       * ===================================================================== */}
      {activeHintModalText !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nội dung Gợi ý"
          data-overlay-container=""
          data-testid="feathered-hint-modal"
          style={{zIndex: 70, backgroundColor: 'rgba(0, 0, 0, 0.72)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
            <div
              style={{
                backgroundColor: '#000000',
                boxShadow: '0 0 35px 20px rgba(0, 0, 0, 0.92)',
              }}
              className="m-auto relative w-full max-w-lg rounded-lg p-6 sm:p-8 text-white">
              <TouchSafeButton
                testId="feathered-hint-close"
                ariaLabel="Đóng nội dung gợi ý"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setActiveHintModalText(null);
                }}
                style={{color: THEME.colors.featheredModalCloseYellow}}
                className="absolute top-2 right-2 w-12 h-12 rounded-lg font-black text-xl flex items-center justify-center">
                <span>X</span>
              </TouchSafeButton>

              <h3
                style={{fontFamily: THEME.fonts.heading}}
                className="text-xl sm:text-2xl font-bold text-white mb-4 pr-10">
                Gợi ý
              </h3>

              <p className="text-sm sm:text-base md:text-lg text-white leading-relaxed whitespace-pre-line">
                {activeHintModalText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * FEATHERED BLACK KNOWLEDGE CANDLE QUIZ MODAL (z-index: 70)
       * ===================================================================== */}
      {isQuizModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tích lũy Nến Tri Thức"
          data-overlay-container=""
          data-testid="feathered-quiz-modal"
          style={{zIndex: 70, backgroundColor: 'rgba(0, 0, 0, 0.75)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
            <div
              style={{
                backgroundColor: '#000000',
                boxShadow: '0 0 35px 20px rgba(0, 0, 0, 0.92)',
              }}
              className="m-auto relative w-full max-w-xl rounded-lg p-6 sm:p-8 text-white">
              <TouchSafeButton
                testId="feathered-quiz-close"
                ariaLabel="Đóng thử thách tri thức"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsQuizModalOpen(false);
                }}
                style={{color: THEME.colors.featheredModalCloseYellow}}
                className="absolute top-2 right-2 w-12 h-12 rounded-lg font-black text-xl flex items-center justify-center">
                <span>X</span>
              </TouchSafeButton>

              {quizRoundStatus === 'ANSWERING' && currentQuizQuestion ? (
                <div className="w-full flex flex-col gap-4 pr-2">
                  <div
                    style={{color: THEME.colors.featheredModalCloseYellow}}
                    className="text-sm sm:text-base font-bold tracking-wide pr-10">
                    {`Câu ${quizStepIndex + 1}/2`}
                  </div>

                  <p className="text-sm sm:text-base md:text-lg text-white font-medium leading-relaxed">
                    {currentQuizQuestion.question}
                  </p>

                  {currentQuizQuestion.type === 'SHORT_ANSWER' && (
                    <div className="w-full flex flex-wrap items-center gap-3 pt-2">
                      <input
                        ref={quizInputRef}
                        type="text"
                        inputMode="numeric"
                        value={quizAnswerInput}
                        placeholder="Nhập số năm / số năm tồn tại..."
                        aria-label="Câu trả lời bằng số"
                        data-testid="quiz-short-input"
                        onChange={(e) => setQuizAnswerInput(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmitQuizAnswer(quizAnswerInput);
                          }
                        }}
                        style={{
                          backgroundColor: '#161616',
                          borderColor: '#FFD700',
                          userSelect: 'text',
                          WebkitUserSelect: 'text',
                        }}
                        className="flex-1 min-w-[160px] min-h-[48px] px-4 py-2.5 rounded-xl border text-white text-base font-bold placeholder:text-stone-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-yellow-400 pointer-events-auto touch-auto"
                      />

                      <TouchSafeButton
                        testId="quiz-short-submit"
                        onClick={() => handleSubmitQuizAnswer(quizAnswerInput)}
                        style={{
                          backgroundColor: THEME.colors.gildedActionBg,
                          color: THEME.colors.ebonyPanel,
                        }}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center">
                        <span>Xác nhận</span>
                      </TouchSafeButton>
                    </div>
                  )}

                  {currentQuizQuestion.type === 'TRUE_FALSE' && (
                    <div className="w-full grid grid-cols-2 gap-3 pt-2">
                      <TouchSafeButton
                        testId="quiz-tf-true"
                        onClick={() => handleSubmitQuizAnswer('Đúng')}
                        style={{
                          backgroundColor: '#1b1b1b',
                          borderColor: '#D4AF37',
                        }}
                        className="py-3 px-5 rounded-xl border text-white font-bold text-base flex items-center justify-center">
                        <span>Đúng</span>
                      </TouchSafeButton>

                      <TouchSafeButton
                        testId="quiz-tf-false"
                        onClick={() => handleSubmitQuizAnswer('Sai')}
                        style={{
                          backgroundColor: '#1b1b1b',
                          borderColor: '#D4AF37',
                        }}
                        className="py-3 px-5 rounded-xl border text-white font-bold text-base flex items-center justify-center">
                        <span>Sai</span>
                      </TouchSafeButton>
                    </div>
                  )}

                  {currentQuizQuestion.type === 'MULTIPLE_CHOICE' &&
                    currentQuizQuestion.options && (
                      <div className="w-full flex flex-col gap-2.5 pt-1">
                        {currentQuizQuestion.options.map((optText, idx) => {
                          const letter = ['A', 'B', 'C', 'D'][idx] ?? 'A';
                          return (
                            <TouchSafeButton
                              key={letter}
                              testId={`quiz-mc-${letter}`}
                              onClick={() => handleSubmitQuizAnswer(letter)}
                              style={{
                                backgroundColor: '#181818',
                                borderColor: 'rgba(212, 175, 55, 0.65)',
                              }}
                              className="w-full py-3 px-4 rounded-xl border text-left text-sm sm:text-base text-white font-medium flex items-center justify-start">
                              <span>{optText}</span>
                            </TouchSafeButton>
                          );
                        })}
                      </div>
                    )}
                </div>
              ) : (
                <div className="w-full flex flex-col items-center text-center gap-5 py-4">
                  <p
                    data-testid="quiz-outcome-msg"
                    style={{
                      color:
                        quizRoundStatus === 'WON' ? '#FFD700' : '#FCA5A5',
                    }}
                    className="text-base sm:text-xl font-bold leading-relaxed px-4">
                    {quizRoundStatus === 'WON' ? QUIZ_WIN_MSG : QUIZ_FAIL_MSG}
                  </p>

                  <TouchSafeButton
                    autoFocus
                    testId="quiz-retry-round"
                    onClick={() => {
                      gameAudio.playConfirmSelect();
                      startNewQuizRound();
                    }}
                    style={{
                      backgroundColor: THEME.colors.gildedActionBg,
                      color: THEME.colors.ebonyPanel,
                    }}
                    className="px-7 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center">
                    <span>Làm tiếp lượt mới</span>
                  </TouchSafeButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
       * FEATHERED BLACK BADGE DETAIL MODAL (z-index: 70)
       * ===================================================================== */}
      {activeBadgeDetail !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeBadgeDetail.title}
          data-overlay-container=""
          data-testid="feathered-badge-detail-modal"
          style={{zIndex: 70, backgroundColor: 'rgba(0, 0, 0, 0.72)'}}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div className="min-h-full w-full flex flex-col items-center px-8 py-6">
            <div
              style={{
                backgroundColor: '#000000',
                boxShadow: '0 0 30px 15px rgba(0, 0, 0, 0.9)',
              }}
              className="m-auto relative w-full max-w-lg rounded-lg p-6 sm:p-8 text-white">
              <TouchSafeButton
                testId="feathered-badge-detail-close"
                ariaLabel="Đóng chi tiết huy hiệu"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setActiveBadgeDetail(null);
                }}
                style={{color: THEME.colors.featheredModalCloseYellow}}
                className="absolute top-2 right-2 w-12 h-12 rounded-lg font-black text-xl flex items-center justify-center">
                <span>X</span>
              </TouchSafeButton>

              <h3
                style={{
                  fontFamily: THEME.fonts.heading,
                  color: THEME.colors.featheredModalCloseYellow,
                }}
                className="text-lg sm:text-xl font-bold mb-3 pr-10">
                {activeBadgeDetail.title}
              </h3>

              <p className="text-sm sm:text-base md:text-lg text-white leading-relaxed">
                {activeBadgeDetail.detailText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* START SCREEN ("Chơi" automatically resumes saved localStorage state if available) */}
      {gameState.status === 'START' && assetsReady && (
        <div
          ref={startScreenRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="vn-main-title"
          data-overlay-container=""
          data-modal="true"
          className="fixed inset-0 z-40 overflow-y-auto touch-auto">
          <div className="fixed inset-0 pointer-events-none">
            {menuBgLoaded ? (
              <img
                src={ASSETS_MANIFEST.menu_background}
                alt="Phủ cổ thời Hậu Lê"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                style={{
                  background: `linear-gradient(135deg, ${THEME.colors.menuFallbackTop} 0%, ${THEME.colors.menuFallbackBottom} 100%)`,
                }}
                className="w-full h-full"
              />
            )}
            <div
              style={{
                background:
                  'linear-gradient(90deg, rgba(16, 11, 8, 0.82) 0%, rgba(16, 11, 8, 0.45) 48%, rgba(16, 11, 8, 0.12) 100%)',
              }}
              className="absolute inset-0"
            />
          </div>

          <div className="relative z-10 min-h-full w-full flex flex-col px-8 sm:px-12 md:px-16 py-6 sm:py-10">
            <div className="my-auto w-full max-w-xl flex flex-col items-start">
              <div
                style={{backgroundColor: 'rgba(26, 17, 13, 0.85)'}}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-medium mb-3 shadow">
                <span>Dấu Ấn Dòng Chảy 1</span>
              </div>

              <h1
                id="vn-main-title"
                style={{
                  fontFamily: THEME.fonts.heading,
                  color: THEME.colors.gildedGoldBright,
                  textShadow:
                    '0 4px 18px rgba(0, 0, 0, 0.95), 0 1px 3px rgba(0, 0, 0, 0.9)',
                }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-2">
                {'Hậu Lê Phiêu Lưu Ký '}
              </h1>

              <p
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)',
                }}
                className="text-stone-200/95 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-md">
                {START_SCREEN_SUBTITLE}
              </p>

              <div className="flex flex-col items-start gap-3.5 sm:gap-4 w-full max-w-[280px] sm:max-w-[320px]">
                <TouchSafeButton
                  onClick={initGame}
                  autoFocus
                  testId="start-button"
                  style={{
                    aspectRatio: `${menuButtonAspectRatio}`,
                    backgroundColor: menuBtnLoaded
                      ? undefined
                      : THEME.colors.ebonyPanel,
                    borderColor: menuBtnLoaded
                      ? undefined
                      : THEME.colors.gildedActionBg,
                    backgroundImage: menuBtnLoaded
                      ? `url(${ASSETS_MANIFEST.menu_button_sprite})`
                      : undefined,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                  className={`w-full flex items-center justify-center px-6 py-3 shadow-2xl ${
                    menuBtnLoaded ? 'bg-transparent' : 'border-2 rounded-lg'
                  }`}>
                  <span
                    style={{
                      fontFamily: THEME.fonts.heading,
                      textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)',
                    }}
                    className="text-lg sm:text-xl md:text-2xl font-bold text-amber-100 tracking-wide">
                    Chơi
                  </span>
                </TouchSafeButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP-LEFT MENU DROPDOWN (Includes "Màn hình chính" & distinct red "Xóa tiến trình") */}
      {isGameMenuOpen && gameState.status === 'PLAYING' && (
        <div
          data-overlay-container=""
          style={{zIndex: 45, backgroundColor: 'rgba(0, 0, 0, 0.45)'}}
          onPointerUp={() => {
            if (!isHowToPlayOpen) {
              gameAudio.playCrispClick();
              setIsGameMenuOpen(false);
            }
          }}
          className="fixed inset-0 overflow-y-auto touch-auto">
          <div
            ref={menuDropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Trò Chơi"
            data-testid="top-left-menu-dropdown"
            onPointerUp={(e) => e.stopPropagation()}
            style={{
              backgroundColor: THEME.colors.ebonyPanel,
              borderColor: THEME.colors.gildedBorder,
            }}
            className={`mt-[64px] ml-8 mr-8 w-[248px] sm:w-[272px] flex flex-col border-2 rounded-xl p-3.5 gap-2.5 shadow-2xl transition-opacity ${
              isHowToPlayOpen ? 'opacity-20 pointer-events-none' : 'opacity-100'
            }`}>
            <TouchSafeButton
              autoFocus={!isHowToPlayOpen}
              onClick={() => {
                gameAudio.playCrispClick();
                setIsGameMenuOpen(false);
              }}
              style={{
                backgroundColor: THEME.colors.gildedActionBg,
                color: THEME.colors.ebonyPanel,
              }}
              className="w-full py-2.5 px-4 rounded-lg font-bold text-sm sm:text-base flex items-center justify-center shadow">
              <span>Tiếp tục</span>
            </TouchSafeButton>

            <TouchSafeButton
              onClick={() => {
                const nextMuted = gameAudio.toggleMute();
                setIsSfxMuted(nextMuted);
                try {
                  window.localStorage?.setItem(
                    'hlplk_sfx_muted',
                    nextMuted ? '1' : '0',
                  );
                } catch {}
                if (!nextMuted) gameAudio.playCrispClick();
              }}
              style={{backgroundColor: THEME.colors.ebonyButtonBg}}
              className="w-full py-2.5 px-4 rounded-lg border border-amber-700/50 text-amber-100 font-semibold text-sm sm:text-base flex items-center justify-center">
              <span>Âm thanh: {isSfxMuted ? 'Tắt' : 'Bật'}</span>
            </TouchSafeButton>

            <TouchSafeButton
              onClick={() => {
                gameAudio.playCrispClick();
                setIsMusicMuted((prev) => {
                  const next = !prev;
                  try {
                    window.localStorage?.setItem(
                      'hlplk_music_muted',
                      next ? '1' : '0',
                    );
                  } catch {}
                  return next;
                });
              }}
              style={{backgroundColor: THEME.colors.ebonyButtonBg}}
              className="w-full py-2.5 px-4 rounded-lg border border-amber-700/50 text-amber-100 font-semibold text-sm sm:text-base flex items-center justify-center">
              <span>Nhạc nền: {isMusicMuted ? 'Tắt' : 'Bật'}</span>
            </TouchSafeButton>

            <TouchSafeButton
              onClick={() => {
                gameAudio.playCrispClick();
                setIsHowToPlayOpen(true);
              }}
              style={{backgroundColor: THEME.colors.ebonyButtonBg}}
              className="w-full py-2.5 px-4 rounded-lg border border-amber-700/50 text-amber-100 font-semibold text-sm sm:text-base flex items-center justify-center">
              <span>Hướng dẫn</span>
            </TouchSafeButton>

            <TouchSafeButton
              testId="menu-return-main-screen"
              onClick={() => {
                gameAudio.playCrispClick();
                closeAllSubModals();
                setGameState((prev) => ({...prev, status: 'START'}));
              }}
              style={{backgroundColor: THEME.colors.ebonyButtonBg}}
              className="w-full py-2.5 px-4 rounded-lg border border-amber-700/50 text-amber-100 font-semibold text-sm sm:text-base flex items-center justify-center">
              <span>Màn hình chính</span>
            </TouchSafeButton>

            <TouchSafeButton
              testId="menu-reset-progress"
              onClick={handleClearProgressAndReturnStart}
              style={{
                background: 'linear-gradient(180deg, #991b1b 0%, #5c0f0f 100%)',
                borderColor: '#f87171',
                color: '#ffffff',
              }}
              className="w-full py-2.5 px-4 rounded-lg border-2 font-bold text-sm sm:text-base flex items-center justify-center shadow-lg">
              <span>Xóa tiến trình</span>
            </TouchSafeButton>
          </div>
        </div>
      )}

      {/* HOW TO PLAY SUB-MODAL */}
      {isHowToPlayOpen && (
        <MenuOverlay tone="neutral" zIndex={60} autoFocus>
          <div
            style={{
              backgroundColor: THEME.colors.ebonyPanelDeep,
              borderColor: THEME.colors.gildedActionBg,
            }}
            className="w-full max-w-md flex flex-col items-center border-2 rounded-xl p-6 shadow-2xl text-stone-100">
            <h2
              style={{
                fontFamily: THEME.fonts.heading,
                color: THEME.colors.gildedGoldBright,
              }}
              className="text-2xl font-bold text-center mb-4">
              Hướng dẫn đọc truyện
            </h2>

            <div className="w-full space-y-3 text-sm sm:text-base text-stone-200 leading-relaxed mb-6">
              <p>
                <strong className="text-amber-300">• Chuột / Cảm ứng:</strong>{' '}
                Nhấp chuột trái hoặc chạm vào khung thoại để hiện trọn vẹn câu
                đang chạy chữ hoặc chuyển sang câu thoại kế tiếp.
              </p>
              <p>
                <strong className="text-amber-300">• Khám phá Cảnh 2:</strong>{' '}
                Kiểm tra lần lượt cả 3 điểm khả nghi (A), (B), (C) trong kho để
                khám phá tờ giấy dó bí ẩn.
              </p>
              <p>
                <strong className="text-amber-300">
                  • Giải mã &amp; Gợi ý Cảnh 3:
                </strong>{' '}
                Đọc bài vè trên tờ giấy dó để tìm năm lịch sử gồm 4 chữ số. Bạn
                có thể dùng <strong>Ngọn Nến Tri Thức</strong> ở mục{' '}
                <strong>Gợi ý</strong> hoặc trả lời câu hỏi lịch sử để tích lũy
                thêm nến!
              </p>
            </div>

            <TouchSafeButton
              autoFocus
              onClick={() => {
                gameAudio.playCrispClick();
                setIsHowToPlayOpen(false);
              }}
              style={{
                backgroundColor: THEME.colors.gildedActionBg,
                color: THEME.colors.ebonyPanel,
              }}
              className="w-full py-3 px-6 rounded-lg font-bold text-base sm:text-lg flex items-center justify-center">
              <span>Đóng</span>
            </TouchSafeButton>
          </div>
        </MenuOverlay>
      )}

      {gameState.status === 'PAUSED' && (
        <Overlay
          title="TẠM DỪNG"
          description="Nhấn Tiếp tục để quay lại hành trình"
          actionLabel="TIẾP TỤC"
          onAction={() =>
            setGameState((prev) => ({...prev, status: 'PLAYING'}))
          }
          tone="neutral"
        />
      )}

      {gameState.status === 'GAME_OVER' && (
        <Overlay
          title="KẾT THÚC"
          description="Thử lại hành trình"
          actionLabel="THỬ LẠI"
          onAction={initGame}
          tone="danger"
        />
      )}
    </div>
  );
}
