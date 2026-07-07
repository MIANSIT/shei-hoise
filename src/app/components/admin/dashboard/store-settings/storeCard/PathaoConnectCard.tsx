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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck, CheckCircle2, Clock, Plus } from "lucide-react";

import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { useTranslation } from "@/lib/hook/useTranslation";
import {
  getConnectedCourierAccounts,
  type CourierAccountStatus,
} from "@/lib/queries/courier/getConnectedCourierAccounts";
import { disconnectCourierAccount } from "@/lib/queries/courier/disconnectCourierAccount";
import { connectPathaoAccount } from "@/lib/queries/pathao/connectPathao";
import { selectPathaoStore } from "@/lib/queries/pathao/selectPathaoStore";
import { createPathaoStore } from "@/lib/queries/pathao/createPathaoStore";
import { checkPathaoStoreApproval } from "@/lib/queries/pathao/checkPathaoStoreApproval";
import {
  getPathaoCities,
  getPathaoZones,
  getPathaoAreas,
} from "@/lib/queries/pathao/getPathaoLocations";
import type { PathaoStore, PathaoCity, PathaoZone, PathaoArea } from "@/lib/utils/pathaoApi";

type WizardStep =
  | "credentials"
  | "select-store"
  | "create-store"
  | "awaiting-approval";

interface PathaoConnectCardProps {
  storeId: string;
}

export function PathaoConnectCard({ storeId }: PathaoConnectCardProps) {
  const notify = useSheiNotification();
  const t = useTranslation();

  const [accounts, setAccounts] = useState<CourierAccountStatus[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("credentials");
  const [submitting, setSubmitting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Step 1 — label + credentials
  const [label, setLabel] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Set once Step 1 succeeds — every later step acts on this specific account.
  const [credentialId, setCredentialId] = useState<string | null>(null);

  // Step 2 — pick an existing store
  const [existingStores, setExistingStores] = useState<PathaoStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  // Step 3 — create a new store
  const [newStoreName, setNewStoreName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [cities, setCities] = useState<PathaoCity[]>([]);
  const [zones, setZones] = useState<PathaoZone[]>([]);
  const [areas, setAreas] = useState<PathaoArea[]>([]);
  const [cityId, setCityId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");
  const [areaId, setAreaId] = useState<string>("");
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [pendingStoreName, setPendingStoreName] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(false);

  const refreshAccounts = () => {
    setLoadingAccounts(true);
    getConnectedCourierAccounts(storeId)
      .then((all) => setAccounts(all.filter((a) => a.courier === "pathao")))
      .finally(() => setLoadingAccounts(false));
  };

  useEffect(() => {
    refreshAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const resetWizard = () => {
    setStep("credentials");
    setLabel("");
    setClientId("");
    setClientSecret("");
    setEmail("");
    setPassword("");
    setCredentialId(null);
    setExistingStores([]);
    setSelectedStoreId("");
    setNewStoreName("");
    setContactName("");
    setContactNumber("");
    setAddress("");
    setCities([]);
    setZones([]);
    setAreas([]);
    setCityId("");
    setZoneId("");
    setAreaId("");
    setPendingStoreName(null);
  };

  const openModal = () => {
    resetWizard();
    setModalOpen(true);
  };

  const handleConnect = async () => {
    setSubmitting(true);
    try {
      const result = await connectPathaoAccount(storeId, {
        label: label.trim(),
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        email: email.trim(),
        password,
      });

      if (!result.success || !result.credentialId) {
        notify.error(result.error ?? t.admin.pathaoConnectFailed);
        return;
      }

      setCredentialId(result.credentialId);

      if (result.existingStores && result.existingStores.length > 0) {
        setExistingStores(result.existingStores);
        setStep("select-store");
      } else {
        const cityResult = await getPathaoCities(result.credentialId);
        if (cityResult.success) setCities(cityResult.data);
        setStep("create-store");
      }
    } catch (err) {
      console.error(err);
      notify.error(t.admin.pathaoConnectFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseExistingStore = async () => {
    const store = existingStores.find(
      (s) => String(s.store_id) === selectedStoreId,
    );
    if (!store || !credentialId) return;

    setSubmitting(true);
    try {
      const result = await selectPathaoStore(credentialId, store.store_id, store.store_name);
      if (!result.success) {
        notify.error(result.error ?? t.admin.pathaoConnectFailed);
        return;
      }
      notify.success(t.admin.pathaoConnectedOk);
      setModalOpen(false);
      refreshAccounts();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCityChange = async (value: string) => {
    if (!credentialId) return;
    setCityId(value);
    setZoneId("");
    setAreaId("");
    setZones([]);
    setAreas([]);
    setLoadingZones(true);
    try {
      const result = await getPathaoZones(credentialId, Number(value));
      if (result.success) setZones(result.data);
    } finally {
      setLoadingZones(false);
    }
  };

  const handleZoneChange = async (value: string) => {
    if (!credentialId) return;
    setZoneId(value);
    setAreaId("");
    setAreas([]);
    setLoadingAreas(true);
    try {
      const result = await getPathaoAreas(credentialId, Number(value));
      if (result.success) setAreas(result.data);
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleCreateStore = async () => {
    if (!credentialId) return;
    setSubmitting(true);
    try {
      const result = await createPathaoStore(credentialId, {
        name: newStoreName.trim(),
        contact_name: contactName.trim(),
        contact_number: contactNumber.trim(),
        address: address.trim(),
        city_id: Number(cityId),
        zone_id: Number(zoneId),
        area_id: Number(areaId),
      });

      if (!result.success) {
        notify.error(result.error ?? t.admin.pathaoConnectFailed);
        return;
      }

      setPendingStoreName(newStoreName.trim());
      setStep("awaiting-approval");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckApproval = async () => {
    if (!pendingStoreName || !credentialId) return;
    setCheckingApproval(true);
    try {
      const result = await checkPathaoStoreApproval(credentialId, pendingStoreName);
      if (!result.success) {
        notify.error(result.error ?? t.admin.pathaoConnectFailed);
        return;
      }
      if (result.connected) {
        notify.success(t.admin.pathaoConnectedOk);
        setModalOpen(false);
        refreshAccounts();
      } else {
        notify.info(t.admin.pathaoStillPending);
      }
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setDisconnectingId(id);
    try {
      const result = await disconnectCourierAccount(id);
      if (!result.success) {
        notify.error(result.error ?? t.admin.pathaoConnectFailed);
        return;
      }
      notify.success(t.admin.pathaoDisconnectedOk);
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
            {t.admin.pathaoCardTitle}
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
                  {account.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {account.label}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          account.environment === "live"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {account.environment === "live" ? t.admin.pathaoLive : t.admin.pathaoSandbox}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.connected
                        ? account.pathaoStoreName
                        : t.admin.pathaoStillPending}
                    </p>
                  </div>
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.admin.pathaoCardTitle}</DialogTitle>
          </DialogHeader>

          {step === "credentials" && (
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
                {t.admin.pathaoCredentialsHint}
              </p>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoClientId}</Label>
                <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoClientSecret}</Label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoEmail}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoPassword}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleConnect}
                  disabled={
                    submitting ||
                    !label.trim() ||
                    !clientId.trim() ||
                    !clientSecret.trim() ||
                    !email.trim() ||
                    !password
                  }
                >
                  {submitting ? t.admin.pathaoConnecting : t.admin.pathaoConnectBtn}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "select-store" && (
            <div className="space-y-3.5">
              <p className="text-xs text-muted-foreground">{t.admin.pathaoSelectStoreHint}</p>
              <RadioGroup value={selectedStoreId} onValueChange={setSelectedStoreId}>
                {existingStores.map((s) => (
                  <div
                    key={s.store_id}
                    className="flex items-center gap-2.5 border border-border rounded-lg px-3 py-2.5"
                  >
                    <RadioGroupItem value={String(s.store_id)} id={`store-${s.store_id}`} />
                    <Label htmlFor={`store-${s.store_id}`} className="flex-1 cursor-pointer">
                      <span className="block text-sm font-medium">{s.store_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.store_address}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <DialogFooter>
                <Button
                  onClick={handleUseExistingStore}
                  disabled={submitting || !selectedStoreId}
                >
                  {t.admin.pathaoUseThisStore}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "create-store" && (
            <div className="space-y-3.5">
              <p className="text-xs text-muted-foreground">{t.admin.pathaoNoStoresFound}</p>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoStoreName}</Label>
                <Input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoContactName}</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoContactNumber}</Label>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.admin.pathaoAddress}</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label>{t.admin.pathaoCity}</Label>
                  <Select value={cityId} onValueChange={handleCityChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.pathaoSelectCity} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.city_id} value={String(c.city_id)}>
                          {c.city_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.admin.pathaoZone}</Label>
                  <Select
                    value={zoneId}
                    onValueChange={handleZoneChange}
                    disabled={!cityId || loadingZones}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.pathaoSelectZone} />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.zone_id} value={String(z.zone_id)}>
                          {z.zone_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.admin.pathaoArea}</Label>
                  <Select
                    value={areaId}
                    onValueChange={setAreaId}
                    disabled={!zoneId || loadingAreas}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.admin.pathaoSelectArea} />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.area_id} value={String(a.area_id)}>
                          {a.area_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleCreateStore}
                  disabled={
                    submitting ||
                    !newStoreName.trim() ||
                    !contactName.trim() ||
                    !contactNumber.trim() ||
                    !address.trim() ||
                    !areaId
                  }
                >
                  {submitting ? t.admin.pathaoCreatingStore : t.admin.pathaoCreateStoreBtn}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "awaiting-approval" && (
            <div className="space-y-4 text-center py-4">
              <Clock className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="text-sm text-foreground font-medium">
                {t.admin.pathaoAwaitingApprovalTitle}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.admin.pathaoAwaitingApprovalHint}
              </p>
              <Button onClick={handleCheckApproval} disabled={checkingApproval}>
                {checkingApproval ? t.admin.pathaoChecking : t.admin.pathaoCheckApproval}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
