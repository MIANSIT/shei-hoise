"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Checkbox, Input, Select, Spin, Switch } from "antd";
import { ImageUp, Mail, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  getCardDesign,
  previewCard,
  saveCardDesign,
  saveEmailSettings,
  sendTestWelcomeEmail,
} from "@/lib/queries/membership/membershipDesign";
import {
  CARD_FONT_OPTIONS,
  DEFAULT_NAME_SLOT_STYLE,
  defaultEmailBrand,
  type CardAlign,
  type CardFontKey,
  type CardSlot,
  type EmailBrand,
} from "@/lib/queries/membership/membershipCardTypes";

type SlotKey = "name" | "number";
type Slots = Record<SlotKey, CardSlot>;
interface Dims {
  width: number;
  height: number;
}

interface CardDesignTabProps {
  storeId: string;
  /** May this person change the card and the email (memberships.edit)? */
  canEdit: boolean;
}

const MIN_BOX = 20;

/** Where the two boxes start on a fresh picture: roughly where a card usually has a name and an ID. */
function defaultSlots(d: Dims): Slots {
  return {
    name: {
      x: Math.round(d.width * 0.09),
      y: Math.round(d.height * 0.44),
      width: Math.round(d.width * 0.41),
      height: Math.round(d.height * 0.1),
      ...DEFAULT_NAME_SLOT_STYLE,
    },
    number: {
      x: Math.round(d.width * 0.16),
      y: Math.round(d.height * 0.665),
      width: Math.round(d.width * 0.22),
      height: Math.round(d.height * 0.06),
      ...DEFAULT_NAME_SLOT_STYLE,
    },
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The card picture with the two boxes on it, which can be dragged (move) and dragged by the corner (resize). */
function SlotEditor({
  src,
  dims,
  slots,
  active,
  disabled,
  onActive,
  onChange,
  onImageLoad,
  labels,
}: {
  src: string;
  dims: Dims | null;
  slots: Slots | null;
  active: SlotKey;
  disabled: boolean;
  onActive: (key: SlotKey) => void;
  onChange: (key: SlotKey, slot: CardSlot) => void;
  onImageLoad: (width: number, height: number) => void;
  labels: Record<SlotKey, string>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: SlotKey; mode: "move" | "resize"; startX: number; startY: number; start: CardSlot } | null>(null);

  const begin = (event: React.PointerEvent, key: SlotKey, mode: "move" | "resize") => {
    if (disabled || !slots) return;
    event.preventDefault();
    wrapRef.current?.setPointerCapture(event.pointerId);
    onActive(key);
    drag.current = { key, mode, startX: event.clientX, startY: event.clientY, start: slots[key] };
  };

  const move = (event: React.PointerEvent) => {
    const current = drag.current;
    const wrap = wrapRef.current;
    if (!current || !wrap || !dims) return;
    const scale = wrap.clientWidth / dims.width;
    const dx = (event.clientX - current.startX) / scale;
    const dy = (event.clientY - current.startY) / scale;
    const s = current.start;
    if (current.mode === "move") {
      onChange(current.key, {
        ...s,
        x: Math.round(clamp(s.x + dx, 0, dims.width - s.width)),
        y: Math.round(clamp(s.y + dy, 0, dims.height - s.height)),
      });
    } else {
      onChange(current.key, {
        ...s,
        width: Math.round(clamp(s.width + dx, MIN_BOX, dims.width - s.x)),
        height: Math.round(clamp(s.height + dy, MIN_BOX, dims.height - s.y)),
      });
    }
  };

  const end = () => {
    drag.current = null;
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none touch-none overflow-hidden rounded-xl border border-border bg-muted"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="block h-auto w-full"
        onLoad={(e) => onImageLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      />
      {dims &&
        slots &&
        (["name", "number"] as SlotKey[]).map((key) => {
          const s = slots[key];
          return (
            <div
              key={key}
              onPointerDown={(e) => begin(e, key, "move")}
              style={{
                left: `${(s.x / dims.width) * 100}%`,
                top: `${(s.y / dims.height) * 100}%`,
                width: `${(s.width / dims.width) * 100}%`,
                height: `${(s.height / dims.height) * 100}%`,
              }}
              className={`absolute border-2 border-dashed ${
                key === active ? "border-indigo-500 bg-indigo-500/15" : "border-rose-500 bg-rose-500/10"
              } ${disabled ? "" : "cursor-move"}`}
            >
              <span className="pointer-events-none absolute -top-5 left-0 rounded bg-background/90 px-1 text-[10px] font-semibold text-foreground">
                {labels[key]}
              </span>
              {!disabled && (
                <span
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    begin(e, key, "resize");
                  }}
                  className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm bg-indigo-600"
                />
              )}
            </div>
          );
        })}
    </div>
  );
}

/**
 * Card & email: the store's membership card picture (with the two boxes where each
 * member's name and number are written) and the welcome email's wording.
 */
export default function CardDesignTab({ storeId, canEdit }: CardDesignTabProps) {
  const t = useTranslation();
  const { success, error: showError } = useSheiNotification();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [blankPreview, setBlankPreview] = useState<string | null>(null);
  const [savedDims, setSavedDims] = useState<Dims | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [erase, setErase] = useState(true);
  const [dims, setDims] = useState<Dims | null>(null);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [active, setActive] = useState<SlotKey>("name");
  const [savingCard, setSavingCard] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const [sampling, setSampling] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [brand, setBrand] = useState<EmailBrand>(() => defaultEmailBrand(""));
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCardDesign(storeId);
      if (!result) {
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setBlankPreview(result.blankPreview);
      const d = result.design;
      setEmailEnabled(d.emailEnabled);
      setBrand(d.emailBrand);
      if (d.hasCard && d.imageWidth && d.imageHeight && d.nameSlot && d.numberSlot) {
        const saved = { width: d.imageWidth, height: d.imageHeight };
        setSavedDims(saved);
        setDims(saved);
        setSlots({ name: d.nameSlot, number: d.numberSlot });
      } else {
        setSavedDims(null);
        setDims(null);
        setSlots(null);
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    },
    [fileUrl],
  );

  const chooseFile = (chosen: File | null) => {
    if (!chosen) return;
    setFile(chosen);
    setFileUrl(URL.createObjectURL(chosen));
    setErase(true);
    setSample(null);
    setDims(null);
  };

  /** The picture's own size is what the boxes are measured in. A new picture of another size starts with fresh boxes. */
  const handleImageLoad = (width: number, height: number) => {
    // The saved picture is shown as a smaller preview: its real size came with the design, so only a freshly chosen file is measured here.
    if (!file) return;
    const next = { width, height };
    setDims(next);
    setSlots((current) => {
      const sameAsSaved = !!savedDims && savedDims.width === width && savedDims.height === height;
      if (current && (!file || sameAsSaved)) return current;
      return defaultSlots(next);
    });
  };

  const updateSlot = (key: SlotKey, slot: CardSlot) => setSlots((current) => (current ? { ...current, [key]: slot } : current));

  const patchActive = (key: SlotKey, patch: Partial<CardSlot>) => {
    if (slots) updateSlot(key, { ...slots[key], ...patch });
  };

  const showSample = async () => {
    setSampling(true);
    try {
      const result = await previewCard(storeId);
      if (result.success && result.image) setSample(result.image);
      else showError(result.error ?? t.admin.mbFailed);
    } finally {
      setSampling(false);
    }
  };

  const saveCard = async () => {
    if (!slots || (!file && !savedDims)) return showError(t.admin.mbCardNeedPicture);
    setSavingCard(true);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      form.append("nameSlot", JSON.stringify(slots.name));
      form.append("numberSlot", JSON.stringify(slots.number));
      form.append("erase", file && erase ? "1" : "0");
      const result = await saveCardDesign(storeId, form);
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(t.admin.mbCardSaved);
      setFile(null);
      setFileUrl(null);
      await load();
      await showSample();
    } finally {
      setSavingCard(false);
    }
  };

  const saveEmail = async () => {
    setSavingEmail(true);
    try {
      const result = await saveEmailSettings(storeId, { emailEnabled, brand });
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(t.admin.mbEmailSavedMsg);
    } finally {
      setSavingEmail(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    try {
      const result = await sendTestWelcomeEmail(storeId, testEmail);
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(t.admin.mbTestSentMsg.replace("{email}", testEmail.trim()));
    } finally {
      setTesting(false);
    }
  };

  const setBrandField = (key: keyof EmailBrand) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBrand((prev) => ({ ...prev, [key]: e.target.value }));

  const alignOptions: { value: CardAlign; label: string }[] = [
    { value: "left", label: t.admin.mbAlignLeft },
    { value: "center", label: t.admin.mbAlignCenter },
    { value: "right", label: t.admin.mbAlignRight },
  ];
  const slotLabels: Record<SlotKey, string> = { name: t.admin.mbCardBoxName, number: t.admin.mbCardBoxNumber };
  const imageSrc = fileUrl ?? blankPreview;
  const labelClass = "block text-xs font-semibold text-muted-foreground";

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }
  if (loadFailed) return <p className="text-sm text-muted-foreground">{t.admin.mbCardLoadFailed}</p>;

  const field = (key: keyof EmailBrand, label: string, props: { textarea?: boolean; max?: number } = {}) => (
    <div>
      <label htmlFor={`mb-brand-${key}`} className={labelClass}>{label}</label>
      {props.textarea ? (
        <Input.TextArea
          id={`mb-brand-${key}`}
          value={brand[key]}
          onChange={setBrandField(key)}
          rows={2}
          maxLength={props.max ?? 300}
          disabled={!canEdit}
          className="mt-1"
        />
      ) : (
        <Input
          id={`mb-brand-${key}`}
          value={brand[key]}
          onChange={setBrandField(key)}
          maxLength={props.max ?? 120}
          disabled={!canEdit}
          className="mt-1"
        />
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 min-w-0">
        <div>
          <h2 className="m-0 text-base font-bold text-foreground">{t.admin.mbCardTitle}</h2>
          <p className="m-0 mt-1 text-xs text-muted-foreground">{t.admin.mbCardHint}</p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                chooseFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
              aria-label={t.admin.mbCardChoose}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <ImageUp size={15} aria-hidden="true" />
              {imageSrc ? t.admin.mbCardReplace : t.admin.mbCardChoose}
            </button>
            {file && (
              <Checkbox checked={erase} onChange={(e) => setErase(e.target.checked)}>
                {t.admin.mbCardErase}
              </Checkbox>
            )}
          </div>
        )}

        {imageSrc ? (
          <>
            <SlotEditor
              src={imageSrc}
              dims={dims}
              slots={slots}
              active={active}
              disabled={!canEdit}
              onActive={setActive}
              onChange={updateSlot}
              onImageLoad={handleImageLoad}
              labels={slotLabels}
            />
            <p className="m-0 text-[11px] text-muted-foreground">{t.admin.mbCardDragHint}</p>

            {slots && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["name", "number"] as SlotKey[]).map((key) => (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 space-y-2 ${key === active ? "border-indigo-400" : "border-border"}`}
                    onFocusCapture={() => setActive(key)}
                  >
                    <div className="text-sm font-bold text-foreground">{slotLabels[key]}</div>
                    <div>
                      <label htmlFor={`mb-font-${key}`} className={labelClass}>{t.admin.mbCardFont}</label>
                      <Select
                        id={`mb-font-${key}`}
                        value={slots[key].fontKey}
                        onChange={(value: CardFontKey) => patchActive(key, { fontKey: value })}
                        options={CARD_FONT_OPTIONS.map((f) => ({ value: f.key, label: f.label }))}
                        disabled={!canEdit}
                        className="w-full mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor={`mb-color-${key}`} className={labelClass}>{t.admin.mbCardColor}</label>
                        <input
                          id={`mb-color-${key}`}
                          type="color"
                          value={slots[key].color}
                          onChange={(e) => patchActive(key, { color: e.target.value })}
                          disabled={!canEdit}
                          className="mt-1 h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor={`mb-align-${key}`} className={labelClass}>{t.admin.mbCardAlign}</label>
                        <Select
                          id={`mb-align-${key}`}
                          value={slots[key].align}
                          onChange={(value: CardAlign) => patchActive(key, { align: value })}
                          options={alignOptions}
                          disabled={!canEdit}
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={saveCard}
                  disabled={savingCard}
                  className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  {savingCard && <Spin size="small" />}
                  {t.admin.mbCardSave}
                </button>
              )}
              {savedDims && !file && (
                <button
                  type="button"
                  onClick={showSample}
                  disabled={sampling}
                  className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
                >
                  <Sparkles size={14} aria-hidden="true" />
                  {t.admin.mbCardSample}
                </button>
              )}
            </div>

            {sample && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground">{t.admin.mbCardSampleTitle}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sample} alt={t.admin.mbCardSampleTitle} className="block h-auto w-full rounded-xl border border-border" />
              </div>
            )}
          </>
        ) : (
          <p className="m-0 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t.admin.mbCardNoPicture}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 min-w-0">
        <div>
          <h2 className="m-0 text-base font-bold text-foreground">{t.admin.mbEmailSectionTitle}</h2>
          <p className="m-0 mt-1 text-xs text-muted-foreground">{t.admin.mbEmailSectionHint}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={emailEnabled} onChange={setEmailEnabled} disabled={!canEdit} aria-label={t.admin.mbEmailOn} />
          {t.admin.mbEmailOn}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("storeName", t.admin.mbBrandStoreName, { max: 60 })}
          {field("tagline", t.admin.mbBrandTagline, { max: 80 })}
          {field("programName", t.admin.mbBrandProgram, { max: 80 })}
          {field("cardHeading", t.admin.mbBrandCardHeading, { max: 40 })}
          {field("heroLine", t.admin.mbBrandHero)}
          {field("emoji", t.admin.mbBrandEmoji, { max: 8 })}
        </div>
        {field("introLine", t.admin.mbBrandIntro, { textarea: true })}
        {field("thanksLine", t.admin.mbBrandThanks, { textarea: true })}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("closingLine", t.admin.mbBrandClosing, { max: 100 })}
          {field("subject", t.admin.mbBrandSubject, { max: 150 })}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["colorPrimary", t.admin.mbBrandColorPrimary],
              ["colorDeep", t.admin.mbBrandColorDeep],
              ["colorGold", t.admin.mbBrandColorGold],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`mb-brand-${key}`} className={labelClass}>{label}</label>
              <input
                id={`mb-brand-${key}`}
                type="color"
                value={brand[key]}
                onChange={(e) => setBrand((prev) => ({ ...prev, [key]: e.target.value }))}
                disabled={!canEdit}
                className="mt-1 h-8 w-full cursor-pointer rounded border border-border bg-transparent"
              />
            </div>
          ))}
        </div>

        {canEdit && (
          <>
            <button
              type="button"
              onClick={saveEmail}
              disabled={savingEmail}
              className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3.5 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {savingEmail && <Spin size="small" />}
              {t.admin.mbEmailSaveBtn}
            </button>

            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="text-sm font-bold text-foreground">{t.admin.mbTestTitle}</div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label={t.admin.mbTestTitle}
                />
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={testing || !testEmail.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl h-8 px-3 border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {testing ? <Spin size="small" /> : <Mail size={14} aria-hidden="true" />}
                  {t.admin.mbTestSend}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
