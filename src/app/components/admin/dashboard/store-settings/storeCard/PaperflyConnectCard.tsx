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
import { connectPaperflyAccount } from "@/lib/queries/paperfly/connectPaperfly";

interface PaperflyConnectCardProps {
  storeId: string;
}

export function PaperflyConnectCard({ storeId }: PaperflyConnectCardProps) {
  const notify = useSheiNotification();
  const t = useTranslation();

  const [accounts, setAccounts] = useState<CourierAccountStatus[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<CourierAccountStatus | null>(null);

  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [paperflyKey, setPaperflyKey] = useState("");
  const [storeName, setStoreName] = useState("");

  const refreshAccounts = () => {
    setLoadingAccounts(true);
    getConnectedCourierAccounts(storeId)
      .then((all) => setAccounts(all.filter((a) => a.courier === "paperfly")))
      .finally(() => setLoadingAccounts(false));
  };

  useEffect(() => {
    refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const openModal = () => {
    setLabel("");
    setUsername("");
    setPassword("");
    setPaperflyKey("");
    setStoreName("");
    setModalOpen(true);
  };

  const handleConnect = async () => {
    setSubmitting(true);
    try {
      const result = await connectPaperflyAccount({
        label: label.trim(),
        username: username.trim(),
        password,
        paperflyKey: paperflyKey.trim(),
        storeName: storeName.trim(),
      });

      if (!result.success) {
        notify.error(result.error ?? t.admin.paperflyConnectFailed);
        return;
      }

      notify.success(t.admin.paperflyConnectedOk);
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
        notify.error(result.error ?? t.admin.paperflyConnectFailed);
        return;
      }
      notify.success(t.admin.paperflyDisconnectedOk);
      refreshAccounts();
    } finally {
      setDisconnectingId(null);
      setDisconnectTarget(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t.admin.paperflyCardTitle}
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
                className="flex flex-col gap-2.5 border border-border rounded-lg px-3.5 py-3"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {account.label}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                    {t.admin.pathaoLive}
                  </span>
                </div>
                {account.pathaoStoreName && (
                  <p className="text-xs text-muted-foreground">
                    {t.admin.paperflyStoreName}: {account.pathaoStoreName}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisconnectTarget(account)}
                  disabled={disconnectingId === account.id}
                  className="w-full"
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
            <DialogTitle>{t.admin.paperflyCardTitle}</DialogTitle>
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
              {t.admin.paperflyCredentialsHint}
            </p>
            <div className="space-y-1.5">
              <Label>{t.admin.paperflyUsername}</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.paperflyPassword}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.paperflyKey}</Label>
              <Input value={paperflyKey} onChange={(e) => setPaperflyKey(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.admin.paperflyStoreName}</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">{t.admin.paperflyStoreNameHint}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConnect}
              disabled={
                submitting ||
                !label.trim() ||
                !username.trim() ||
                !password ||
                !paperflyKey.trim() ||
                !storeName.trim()
              }
            >
              {submitting ? t.admin.paperflyConnecting : t.admin.paperflyConnectBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!disconnectTarget}
        onOpenChange={(open) => !open && setDisconnectTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.admin.courierDisconnectConfirmTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t.admin.courierDisconnectConfirmBody.replace(
              "{label}",
              disconnectTarget?.label ?? "",
            )}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisconnectTarget(null)}
              disabled={!!disconnectingId}
            >
              {t.admin.courierDisconnectCancelBtn}
            </Button>
            <Button
              variant="destructive"
              onClick={() => disconnectTarget && handleDisconnect(disconnectTarget.id)}
              disabled={!!disconnectingId}
            >
              {t.admin.courierDisconnectConfirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
