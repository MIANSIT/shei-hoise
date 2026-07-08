"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Truck, CheckCircle2, Plus } from "lucide-react";

import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getConnectedCourierAccounts,
  type CourierAccountStatus,
} from "@/lib/queries/courier/getConnectedCourierAccounts";
import { disconnectCourierAccount } from "@/lib/queries/courier/disconnectCourierAccount";
import { connectSteadfastAccount } from "@/lib/queries/steadfast/connectSteadfast";

interface SteadfastConnectCardProps {
  storeId: string;
}

export function SteadfastConnectCard({ storeId }: SteadfastConnectCardProps) {
  const notify = useSheiNotification();
  const t = useTranslation();

  const [accounts, setAccounts] = useState<CourierAccountStatus[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const refreshAccounts = () => {
    setLoadingAccounts(true);
    getConnectedCourierAccounts(storeId)
      .then((all) => setAccounts(all.filter((a) => a.courier === "steadfast")))
      .finally(() => setLoadingAccounts(false));
  };

  useEffect(() => {
    refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const openModal = () => {
    setLabel("");
    setApiKey("");
    setSecretKey("");
    setModalOpen(true);
  };

  const handleConnect = async () => {
    setSubmitting(true);
    try {
      const result = await connectSteadfastAccount({
        label: label.trim(),
        apiKey: apiKey.trim(),
        secretKey: secretKey.trim(),
      });

      if (!result.success) {
        notify.error(result.error ?? t.admin.steadfastConnectFailed);
        return;
      }

      notify.success(t.admin.steadfastConnectedOk);
      setModalOpen(false);
      refreshAccounts();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setDisconnectingId(id);
    try {
      const result = await disconnectCourierAccount(id);
      if (!result.success) {
        notify.error(result.error ?? t.admin.steadfastConnectFailed);
        return;
      }
      notify.success(t.admin.steadfastDisconnectedOk);
      refreshAccounts();
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t.admin.steadfastCardTitle}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openModal} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t.admin.pathaoAddAccount}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loadingAccounts ? (
            <p className="text-sm text-muted-foreground">{t.admin.loading}</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.admin.pathaoNotConnected}</p>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between border border-border rounded-lg px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {account.label}
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      {t.admin.pathaoLive}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={disconnectingId === account.id}
                >
                  {t.admin.pathaoDisconnect}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.steadfastCardTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>{t.admin.pathaoLabel}</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.admin.pathaoLabelPlaceholder}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.admin.steadfastCredentialsHint}
            </p>
            <div className="space-y-1.5">
              <Label>{t.admin.steadfastApiKey}</Label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.steadfastSecretKey}</Label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConnect}
              disabled={submitting || !label.trim() || !apiKey.trim() || !secretKey.trim()}
            >
              {submitting ? t.admin.steadfastConnecting : t.admin.steadfastConnectBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
