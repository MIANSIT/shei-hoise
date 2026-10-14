"use client";

import { useEffect, useState } from "react";
import { Check, Info, Palette as PaletteIcon, Sparkles } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getStoreBrandingForAdmin } from "@/lib/queries/storefront/branding/getStoreBrandingForAdmin";
import { saveStoreBranding } from "@/lib/queries/storefront/branding/saveStoreBranding";
import {
  BRAND_PRESETS,
  buttonTextContrast,
  deriveStoreThemeVars,
  type BrandPalette,
} from "@/lib/utils/storeTheme";

// Two separate gates layered on this one card:
// - "storefront_design" (checked one level up, by the page) decides whether a
//   store can reach this card at all — that alone is enough for Default +
//   the hand-picked presets below, since those are pre-verified to hold up
//   in both light and dark mode.
// - "custom_store_design" decides the extra step beyond that: picking fully
//   arbitrary colors per field. No plan grants it yet, so today's stores see
//   Default + presets only (or, for a store with a custom palette saved
//   before presets existed, that legacy palette read-only) — never a "this
//   feature is locked" wall, since the base storefront-design capability
//   still works fully without it.
const CUSTOM_COLOR_FEATURE_KEY = "custom_store_design";

const COLOR_FIELDS: { key: keyof BrandPalette; label: string; hint: string }[] = [
  { key: "primary", label: "Buttons & links", hint: "Add to Cart, links, sold badge" },
  { key: "hover", label: "Button hover", hint: "Add to Cart when hovered" },
  { key: "accent", label: "Buy Now button", hint: "The Buy Now button" },
  { key: "background", label: "Page background", hint: "Behind everything" },
  { key: "header", label: "Header", hint: "Top bar with your logo" },
  { key: "footer", label: "Footer", hint: "Bottom of every page" },
  { key: "card", label: "Cards", hint: "Product cards and panels" },
];

// Fields whose label text is picked automatically — flagged when that text
// would be hard to read on the color the owner chose.
const BUTTON_KEYS: (keyof BrandPalette)[] = ["primary", "accent"];

// These two may be left empty: hover then darkens the main button color
// itself, and Buy Now keeps the storefront's original orange.
const OPTIONAL_KEYS: (keyof BrandPalette)[] = ["hover", "accent"];

const isFullHex = (value: string | undefined): boolean => !!value && /^#[0-9A-Fa-f]{6}$/.test(value);

/** "f55547", "F55547 " or "#f55" typed or pasted become "#F55547" / "#F55" as you go. */
function normalizeHexInput(raw: string, optional: boolean): string {
  if (optional && raw.trim() === "") return "";
  return "#" + raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
}

/** Drops empty optional colors so they're saved as "not set", not as an invalid "". */
function cleanPalette(palette: BrandPalette): BrandPalette {
  const cleaned = { ...palette };
  if (!cleaned.hover || cleaned.hover === "#") delete cleaned.hover;
  if (!cleaned.accent || cleaned.accent === "#") delete cleaned.accent;
  return cleaned;
}

/** A small storefront mock-up wearing the palette, so owners see the result before saving. */
function PalettePreview({ palette }: { palette: BrandPalette }) {
  // Dark mode is derived from the same palette (same hue, remapped lightness),
  // exactly what shoppers see when their device or the store toggle is dark.
  const [mode, setMode] = useState<"light" | "dark">("light");
  const vars = deriveStoreThemeVars(palette)[mode] as React.CSSProperties;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <div className="inline-flex rounded-lg border border-border p-0.5 text-xs font-medium">
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                mode === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div style={vars} className="overflow-hidden rounded-xl border border-border text-[11px]">
        <div
          className="flex items-center justify-between px-3 py-2 font-bold"
          style={{ background: "var(--header)", color: "var(--header-foreground)" }}
        >
          <span>Your Store</span>
          <span>Cart</span>
        </div>
        <div className="p-3" style={{ background: "var(--background)", color: "var(--foreground)" }}>
          <div
            className="space-y-2 rounded-lg border border-black/5 p-3"
            style={{ background: "var(--card)", color: "var(--card-foreground)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">Sample product</p>
                <p className="font-bold">৳350.00</p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 font-medium"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                4 sold
              </span>
            </div>
            <div className="flex gap-2">
              <span
                className="flex-1 rounded-lg py-2 text-center font-semibold"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Add to Cart
              </span>
              <span
                className="flex-1 rounded-lg py-2 text-center font-semibold"
                style={{
                  background: "var(--accent-buy, #f97316)",
                  color: "var(--accent-buy-foreground, #ffffff)",
                }}
              >
                Buy Now
              </span>
            </div>
          </div>
        </div>
        <div
          className="px-3 py-2"
          style={{ background: "var(--footer)", color: "var(--footer-foreground)" }}
        >
          Footer
        </div>
      </div>
    </div>
  );
}

// Free-pick custom colors are intentionally not offered anymore — an
// arbitrary hex a store owner picks can look fine in light mode and then
// have poor/broken contrast once auto-derived for dark mode (or vice versa).
// Presets are hand-picked and run through the same derivation, so they're
// verified to hold up in both. A store that already saved a custom palette
// before this change keeps rendering it (read-only below) rather than being
// silently reset.

const DEFAULT_CUSTOM: BrandPalette = {
  primary: "#171717",
  hover: "#000000",
  accent: "#F97316",
  background: "#FAFAFA",
  header: "#FFFFFF",
  footer: "#171717",
  card: "#FFFFFF",
};

export function BrandPaletteCard() {
  const notify = useSheiNotification();
  const { storeId } = useCurrentUser();
  const { loading: gateLoading, allowed: customColorsEnabled } = useFeatureGate(storeId, CUSTOM_COLOR_FEATURE_KEY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customPalette, setCustomPalette] = useState<BrandPalette>(DEFAULT_CUSTOM);
  const [useDefault, setUseDefault] = useState(true);

  useEffect(() => {
    getStoreBrandingForAdmin()
      .then((branding) => {
        const palette = branding?.theme_palette;
        if (!palette) {
          setUseDefault(true);
          return;
        }
        setUseDefault(false);
        const matchingPreset = BRAND_PRESETS.find(
          (preset) => JSON.stringify(preset.palette) === JSON.stringify(palette),
        );
        if (matchingPreset) {
          setSelectedPresetId(matchingPreset.id);
        } else {
          setIsCustom(true);
          // Back-fills "hover" for a palette saved before that field existed,
          // so the color input below always has a value to show.
          setCustomPalette({ ...DEFAULT_CUSTOM, ...palette });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const activePalette: BrandPalette | null = useDefault
    ? null
    : isCustom
      ? cleanPalette(customPalette)
      : (BRAND_PRESETS.find((p) => p.id === selectedPresetId)?.palette ?? null);

  // Custom colors that aren't a full #RRGGBB yet (optional ones may be empty).
  const invalidFields =
    isCustom && !useDefault
      ? COLOR_FIELDS.filter(({ key }) => {
          const value = customPalette[key];
          if (OPTIONAL_KEYS.includes(key) && (!value || value === "#")) return false;
          return !isFullHex(value);
        })
      : [];

  const handleSave = async () => {
    if (invalidFields.length > 0) {
      notify.error(
        `Enter a full color like #F55547 for: ${invalidFields.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    setSaving(true);
    try {
      const result = await saveStoreBranding({
        theme_palette: activePalette,
      });
      if (!result.success) {
        notify.error(result.error ?? "Failed to save");
        return;
      }
      notify.success("Storefront design saved");
    } finally {
      setSaving(false);
    }
  };

  if (loading || gateLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <PaletteIcon className="h-4 w-4" />
          Brand Colors
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick a preset — this colors your whole storefront: buttons, header, footer, backgrounds, in both light and dark mode.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setUseDefault(true);
            setIsCustom(false);
          }}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            useDefault ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
          }`}
        >
          Default
        </button>
        {BRAND_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              setUseDefault(false);
              setIsCustom(false);
              setSelectedPresetId(preset.id);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              !useDefault && !isCustom && selectedPresetId === preset.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.palette.primary }} />
              <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.palette.footer }} />
            </span>
            {preset.name}
            {!useDefault && !isCustom && selectedPresetId === preset.id && <Check className="h-3.5 w-3.5" />}
          </button>
        ))}
        {customColorsEnabled && (
          <button
            type="button"
            onClick={() => {
              setUseDefault(false);
              setIsCustom(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              !useDefault && isCustom ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Custom
          </button>
        )}
      </div>

      {isCustom && !useDefault && (
        <div className="space-y-3">
          {!customColorsEnabled && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 text-xs text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This store is on a custom color set from before presets existed. Custom colors
                can no longer be edited directly here — pick one of the presets above to change
                your colors (a custom color sometimes looks wrong in dark mode, which is why this
                is now locked to presets).
              </span>
            </div>
          )}
          {customColorsEnabled && (
            <p className="text-xs text-muted-foreground">
              Pick your own colors — check that text stays readable against each one in both light and dark mode.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {COLOR_FIELDS.map(({ key, label, hint }) =>
              customColorsEnabled ? (
                <div key={key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-foreground">
                    {label}
                    <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isFullHex(customPalette[key]) ? (customPalette[key] as string) : "#000000"}
                      onChange={(e) => setCustomPalette((prev) => ({ ...prev, [key]: e.target.value.toUpperCase() }))}
                      className="w-9 h-9 rounded-lg border border-border shrink-0 cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={customPalette[key]}
                      onChange={(e) =>
                        setCustomPalette((prev) => ({
                          ...prev,
                          [key]: normalizeHexInput(e.target.value, OPTIONAL_KEYS.includes(key)),
                        }))
                      }
                      maxLength={9}
                      placeholder={OPTIONAL_KEYS.includes(key) ? "Auto" : "#RRGGBB"}
                      className={`w-24 px-2 py-1.5 rounded-lg border bg-background text-xs font-mono uppercase text-foreground outline-none focus:border-primary ${
                        invalidFields.some((f) => f.key === key) ? "border-red-500" : "border-border"
                      }`}
                    />
                  </div>
                  {invalidFields.some((f) => f.key === key) && (
                    <p className="text-[11px] text-red-500">Use 6 digits, like #F55547</p>
                  )}
                  {BUTTON_KEYS.includes(key) &&
                    /^#[0-9a-fA-F]{6}$/.test(customPalette[key] ?? "") &&
                    buttonTextContrast(customPalette[key] as string) < 3 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Button text may be hard to read on this color.
                      </p>
                    )}
                </div>
              ) : (
                <div key={key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    {label}
                    <span className="block text-[11px] font-normal">{hint}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-9 h-9 rounded-lg border border-border shrink-0"
                      style={{ background: customPalette[key] }}
                    />
                    <span className="text-xs font-mono text-muted-foreground uppercase">{customPalette[key]}</span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {activePalette && invalidFields.length === 0 && <PalettePreview palette={activePalette} />}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
