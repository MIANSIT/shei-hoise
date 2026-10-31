"use client";

import { useEffect, useRef, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Checkbox, DatePicker, Input, Modal, Select, Spin } from "antd";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { searchMembershipCustomers } from "@/lib/queries/membership/memberships";
import type { Member, MembershipCustomerOption, MembershipPlan } from "@/lib/queries/membership/membershipTypes";

export interface AssignValues {
  customerId: string;
  planId: string;
  membershipNumber: string;
  startsOn: string;
  endsOn: string | null;
  notes: string;
  /** Where the welcome email goes. */
  email: string;
  /** Send the welcome email now (new membership) or again (editing one). */
  sendWelcomeEmail: boolean;
}

interface AssignMembershipModalProps {
  open: boolean;
  /** The member being changed, or null to give a new membership. */
  editing: Member | null;
  plans: readonly MembershipPlan[];
  saving: boolean;
  onSubmit: (values: AssignValues) => void;
  onCancel: () => void;
}

const SEARCH_DELAY_MS = 300;

/** Give a customer a membership, or change an existing one. The number is typed by the store. */
export default function AssignMembershipModal({ open, editing, plans, saving, onSubmit, onCancel }: AssignMembershipModalProps) {
  const t = useTranslation();
  const { storeId } = useCurrentUser();
  const { error: showError } = useSheiNotification();

  const [customerId, setCustomerId] = useState<string | undefined>();
  const [customerOptions, setCustomerOptions] = useState<MembershipCustomerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [planId, setPlanId] = useState<string | undefined>();
  const [number, setNumber] = useState("");
  const [startsOn, setStartsOn] = useState<Dayjs>(dayjs());
  const [endsOn, setEndsOn] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [sendWelcome, setSendWelcome] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setCustomerOptions([]);
    setSearching(false);
    if (editing) {
      setCustomerId(editing.customerId);
      setPlanId(editing.planId);
      setNumber(editing.membershipNumber);
      setStartsOn(dayjs(editing.startsOn));
      setEndsOn(editing.endsOn ? dayjs(editing.endsOn) : null);
      setNotes(editing.notes ?? "");
      setEmail(editing.customerEmail ?? "");
      setSendWelcome(false);
    } else {
      setCustomerId(undefined);
      setPlanId(plans.find((p) => p.isActive)?.id);
      setNumber("");
      setStartsOn(dayjs());
      setEndsOn(null);
      setNotes("");
      setEmail("");
      setSendWelcome(true);
    }
    // Plans only seed the starting level; they must not reset the form while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const handleSearch = (text: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!storeId || text.trim().length < 2) {
      setCustomerOptions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const seq = ++searchSeq.current;
    searchTimer.current = setTimeout(async () => {
      const found = await searchMembershipCustomers(storeId, text);
      // A slower, older search must not overwrite a newer one.
      if (seq !== searchSeq.current) return;
      setCustomerOptions(found);
      setSearching(false);
    }, SEARCH_DELAY_MS);
  };

  const planOptions = plans
    .filter((p) => p.isActive || p.id === editing?.planId)
    .map((p) => ({ value: p.id, label: p.name }));

  const submit = () => {
    if (!customerId) return showError(t.admin.mbPickCustomer);
    if (!planId) return showError(t.admin.mbPickLevel);
    if (!number.trim()) return showError(t.admin.mbNumberRequired);
    if (sendWelcome && !email.trim()) return showError(t.admin.mbEmailNeeded);
    onSubmit({
      customerId,
      planId,
      membershipNumber: number.trim(),
      startsOn: startsOn.format("YYYY-MM-DD"),
      endsOn: endsOn ? endsOn.format("YYYY-MM-DD") : null,
      notes,
      email: email.trim(),
      sendWelcomeEmail: sendWelcome && !!email.trim(),
    });
  };

  const labelClass = "block text-xs font-semibold text-muted-foreground";

  return (
    <Modal
      open={open}
      onCancel={saving ? undefined : onCancel}
      onOk={submit}
      okText={t.admin.mbSave}
      cancelText={t.admin.mbCancel}
      confirmLoading={saving}
      title={editing ? t.admin.mbEditTitle : t.admin.mbAssignTitle}
      destroyOnHidden
    >
      <div className="space-y-3 pt-2">
        <div>
          <label htmlFor="mb-customer" className={labelClass}>{t.admin.mbFieldCustomer}</label>
          {editing ? (
            <Input id="mb-customer" value={`${editing.customerName}${editing.customerPhone ? ` · ${editing.customerPhone}` : ""}`} disabled className="mt-1" />
          ) : (
            <>
              <Select
                id="mb-customer"
                showSearch={{ filterOption: false, onSearch: handleSearch }}
                value={customerId}
                onChange={(id: string) => {
                  setCustomerId(id);
                  // Their saved email (if any) is offered for the welcome email.
                  setEmail(customerOptions.find((c) => c.id === id)?.email ?? "");
                }}
                placeholder={t.admin.mbCustomerPlaceholder}
                notFoundContent={searching ? <Spin size="small" /> : t.admin.mbNoCustomers}
                className="w-full mt-1"
                options={customerOptions.map((c) => ({
                  value: c.id,
                  disabled: c.isMember,
                  label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}${c.isMember ? ` (${t.admin.mbAlreadyMember})` : ""}`,
                }))}
              />
              <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.mbCustomerHint}</p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="mb-level" className={labelClass}>{t.admin.mbFieldLevel}</label>
          <Select id="mb-level" value={planId} onChange={setPlanId} options={planOptions} className="w-full mt-1" />
        </div>

        <div>
          <label htmlFor="mb-number" className={labelClass}>{t.admin.mbFieldNumber}</label>
          <Input id="mb-number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={40} className="mt-1" />
          <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.mbNumberHint}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="mb-start" className={labelClass}>{t.admin.mbFieldStart}</label>
            <DatePicker
              id="mb-start"
              format="DD-MM-YYYY"
              value={startsOn}
              onChange={(d) => d && setStartsOn(d)}
              allowClear={false}
              className="w-full mt-1"
            />
          </div>
          <div>
            <label htmlFor="mb-end" className={labelClass}>{t.admin.mbFieldEnd}</label>
            <DatePicker
              id="mb-end"
              format="DD-MM-YYYY"
              value={endsOn}
              onChange={setEndsOn}
              disabledDate={(d) => d.isBefore(startsOn, "day")}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div>
          <label htmlFor="mb-email" className={labelClass}>{t.admin.mbFieldEmail}</label>
          <Input
            id="mb-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            className="mt-1"
          />
          <Checkbox checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} className="mt-2">
            {editing ? t.admin.mbSendWelcomeAgain : t.admin.mbSendWelcome}
          </Checkbox>
          <p className="m-0 mt-1 text-[11px] text-muted-foreground">{t.admin.mbEmailHint}</p>
        </div>

        <div>
          <label htmlFor="mb-notes" className={labelClass}>{t.admin.mbFieldNotes}</label>
          <Input.TextArea id="mb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className="mt-1" />
        </div>
      </div>
    </Modal>
  );
}
