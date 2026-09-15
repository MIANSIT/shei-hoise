"use client";

import { useEffect, useState } from "react";
import { Check, Info, Palette as PaletteIcon, Sparkles } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useFeatureGate } from "@/lib/hook/useFeatureGate";
import { getStoreBrandingForAdmin } from "@/lib/queries/storefront/branding/getStoreBrandingForAdmin";
import { saveStoreBranding } from "@/lib/queries/storefront/branding/saveStoreBranding";
import { BRAND_PRESETS, type BrandPalette } from "@/lib/utils/storeTheme";

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

const COLOR_FIELDS: { key: keyof BrandPalette; label: string }[] = [
  { key: "primary", label: "Buttons & links" },
  { key: "hover", label: "Button hover" },
  { key: "background", label: "Page background" },
  { key: "header", label: "Header" },
  { key: "footer", label: "Footer" },
  { key: "card", label: "Cards" },
];

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
      ? customPalette
      : (BRAND_PRESETS.find((p) => p.id === selectedPresetId)?.palette ?? null);

  const handleSave = async () => {
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
            {COLOR_FIELDS.map(({ key, label }) =>
              customColorsEnabled ? (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPalette[key]}
                      onChange={(e) => setCustomPalette((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-9 h-9 rounded-lg border border-border shrink-0 cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={customPalette[key]}
                      onChange={(e) => setCustomPalette((prev) => ({ ...prev, [key]: e.target.value }))}
                      maxLength={7}
                      className="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-mono uppercase text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ) : (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
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
