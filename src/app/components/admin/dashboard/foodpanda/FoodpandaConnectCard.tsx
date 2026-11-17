"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "antd";
import { Link2, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import {
  connectFoodpandaAccount,
  type ConnectFoodpandaInput,
} from "@/lib/queries/foodpanda/connectFoodpandaAccount";

interface Props {
  onConnected: () => void;
}

/**
 * Connect form for a foodpanda vendor. Everything here comes from the Partner
 * Portal's Shops Integrations plugin: chain and vendor ids, the OAuth client
 * pair, and the webhook secret.
 *
 * The two webhook URLs are shown only after connecting, because they contain
 * the account id that does not exist until then.
 */
export function FoodpandaConnectCard({ onConnected }: Props) {
  const notify = useSheiNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ConnectFoodpandaInput>({
    label: "foodpanda",
    environment: "sandbox",
    chainId: "",
    vendorId: "",
    clientId: "",
    clientSecret: "",
    webhookAuthType: "static",
    orderWebhookSecret: "",
    catalogWebhookSecret: "",
  });

  const set = <K extends keyof ConnectFoodpandaInput>(k: K, v: ConnectFoodpandaInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const result = await connectFoodpandaAccount(form);
      if (!result.success) {
        notify.error(result.error ?? "Could not connect foodpanda");
        return;
      }
      notify.success("foodpanda connected");
      onConnected();
    } catch (err) {
      console.error("foodpanda connect failed:", err);
      notify.error(err instanceof Error ? err.message : "Could not connect foodpanda");
    } finally {
      setSaving(false);
    }
  };

  const ready =
    form.chainId.trim() &&
    form.vendorId.trim() &&
    form.clientId.trim() &&
    form.clientSecret.trim() &&
    form.orderWebhookSecret.trim();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="h-4 w-4 text-pink-500" />
        <h2 className="text-base font-semibold m-0">Connect foodpanda</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Find these in the Partner Portal under All Settings → Shops Integrations.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.label} onChange={(e) => set("label", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Environment</Label>
          <Select
            className="w-full"
            value={form.environment}
            onChange={(v) => set("environment", v)}
            options={[
              { value: "sandbox", label: "Sandbox (testing)" },
              { value: "live", label: "Live" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Chain ID</Label>
          <Input
            value={form.chainId}
            onChange={(e) => set("chainId", e.target.value)}
            placeholder="a2c999a8-03ad-4483-8813-2f47ba414b45"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vendor ID</Label>
          <Input
            value={form.vendorId}
            onChange={(e) => set("vendorId", e.target.value)}
            placeholder="f5wh"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Client ID</Label>
          <Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Client Secret</Label>
          <Input
            type="password"
            value={form.clientSecret}
            onChange={(e) => set("clientSecret", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-3 sm:p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-xs font-medium">Webhook security</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Must match the mode set on your chain in the portal. Static sends your token in the
          Authorization header; HMAC signs each request and sends it in X-DH-Signature.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select
              className="w-full"
              value={form.webhookAuthType}
              onChange={(v) => set("webhookAuthType", v)}
              options={[
                { value: "static", label: "Static token" },
                { value: "hmac", label: "HMAC signature" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Order webhook secret</Label>
            <Input
              type="password"
              value={form.orderWebhookSecret}
              onChange={(e) => set("orderWebhookSecret", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Assortment webhook secret</Label>
            <Input
              type="password"
              value={form.catalogWebhookSecret}
              onChange={(e) => set("catalogWebhookSecret", e.target.value)}
              placeholder="Leave blank to reuse the order secret"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={saving || !ready}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {saving ? "Checking credentials…" : "Connect"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-right">
        We request a token before saving, so a wrong secret fails here rather than silently later.
      </p>
    </div>
  );
}

/** Shows the two URLs to paste back into the Partner Portal after connecting. */
export function FoodpandaWebhookUrls({ accountId, siteUrl }: { accountId: string; siteUrl: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const base = siteUrl.replace(/\/$/, "");
  const urls = [
    { label: "Order webhook", url: `${base}/api/foodpanda/webhook/order/${accountId}` },
    { label: "Assortment webhook", url: `${base}/api/foodpanda/webhook/catalog/${accountId}` },
  ];

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-semibold m-0 mb-1">Paste these into the Partner Portal</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Shops Integrations → Webhook Settings. Orders only reach your dashboard once these are saved.
      </p>
      <div className="space-y-2">
        {urls.map((u) => (
          <div key={u.url} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">{u.label}</div>
              <code className="block truncate text-xs font-mono">{u.url}</code>
            </div>
            <Button size="sm" variant="outline" onClick={() => copy(u.url)}>
              {copied === u.url ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
