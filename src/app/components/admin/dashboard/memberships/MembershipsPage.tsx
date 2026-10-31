"use client";

import { useCallback, useEffect, useState } from "react";
import { Spin } from "antd";
import { Crown } from "lucide-react";
import { useCurrentUser } from "@/lib/hook/useCurrentUser";
import { useTranslation } from "@/lib/hook/useTranslation";
import { useSheiNotification } from "@/lib/hook/useSheiNotification";
import { usePermissions } from "@/lib/context/PermissionsContext";
import { getCategoriesQuery } from "@/lib/queries/categories/getCategories";
import {
  assignMembership,
  deleteMembershipPlan,
  getMembers,
  getMembershipPlans,
  removeMembership,
  runAutoMembershipCheck,
  saveMembershipPlan,
  updateMembership,
} from "@/lib/queries/membership/memberships";
import type { Member, MembershipPlan, MembershipPlanInput } from "@/lib/queries/membership/membershipTypes";
import AssignMembershipModal, { type AssignValues } from "./AssignMembershipModal";
import LevelFormModal, { type CategoryOption } from "./LevelFormModal";
import LevelsTab from "./LevelsTab";
import MembersTab from "./MembersTab";
import CardDesignTab from "./CardDesignTab";
import { getGmailComposeDraft } from "@/lib/queries/membership/membershipDesign";

type Tab = "members" | "levels" | "card";

/**
 * Memberships: the store's membership levels (with their discounts) and the
 * customers it has given a level to. A membership is given by hand and its
 * number is typed by the store.
 */
export default function MembershipsPage() {
  const t = useTranslation();
  const { storeId, loading: userLoading } = useCurrentUser();
  const { can } = usePermissions();
  const { success, error: showError } = useSheiNotification();

  const [tab, setTab] = useState<Tab>("members");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignOpen, setAssignOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  const [levelOpen, setLevelOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [levelSaving, setLevelSaving] = useState(false);
  const [checkingAuto, setCheckingAuto] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [planList, memberList, categoryResult] = await Promise.all([
        getMembershipPlans(storeId),
        getMembers(storeId),
        getCategoriesQuery(storeId, { status: true }),
      ]);
      setPlans(planList);
      setMembers(memberList);
      const rows = (categoryResult.data ?? []) as unknown as { id: string; name: string }[];
      setCategories(rows.map((c) => ({ id: c.id, name: c.name })));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!userLoading) load();
  }, [userLoading, load]);

  const openAssign = () => {
    setEditingMember(null);
    setAssignOpen(true);
  };

  const openEditMember = (member: Member) => {
    setEditingMember(member);
    setAssignOpen(true);
  };

  const submitMembership = async (values: AssignValues) => {
    if (!storeId) return;
    setAssignSaving(true);
    try {
      const result = editingMember
        ? await updateMembership(storeId, editingMember.id, {
            planId: values.planId,
            membershipNumber: values.membershipNumber,
            startsOn: values.startsOn,
            endsOn: values.endsOn,
            notes: values.notes,
            email: values.email,
            sendWelcomeEmail: values.sendWelcomeEmail,
          })
        : await assignMembership(storeId, values);
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(t.admin.mbSaved);
      // The membership is saved either way; say how the welcome email went.
      if (result.emailResult?.status === "sent") {
        success(t.admin.mbEmailSent.replace("{email}", values.email));
      } else if (result.emailResult?.status === "failed") {
        showError(t.admin.mbEmailFailed.replace("{error}", result.emailResult.error ?? ""));
      } else if (result.emailResult?.status === "skipped") {
        showError(t.admin.mbEmailSkipped.replace("{error}", result.emailResult.error ?? ""));
      }
      setAssignOpen(false);
      await load();
    } finally {
      setAssignSaving(false);
    }
  };

  const removeMember = async (member: Member) => {
    if (!storeId) return;
    const result = await removeMembership(storeId, member.id);
    if (!result.success) {
      showError(result.error ?? t.admin.mbFailed);
      return;
    }
    success(t.admin.mbRemoved);
    await load();
  };

  /**
   * Opens Gmail with the member's address and subject filled in, in the store's own Gmail account
   * (Gmail picks the signed-in account that matches the store's email). A link can only carry plain
   * text, so the whole styled email (layout, colours, card) is copied to the clipboard to paste into
   * the message body. If the browser won't copy it, the plain text goes in the link and the card
   * picture is copied (or downloaded) instead.
   */
  const openGmail = async (member: Member) => {
    if (!storeId) return;
    // Opened straight away, inside the click, so the browser does not block it; pointed at Gmail once the draft is ready.
    const tab = window.open("about:blank", "_blank");
    const draftPromise = getGmailComposeDraft(storeId, member.id);

    let copied: "email" | "card" | null = null;
    try {
      if (navigator.clipboard && "ClipboardItem" in window) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": draftPromise.then((draft) => {
              if (!draft?.html) throw new Error("no email to copy");
              return new Blob([draft.html], { type: "text/html" });
            }),
            "text/plain": draftPromise.then((draft) => new Blob([draft?.body ?? ""], { type: "text/plain" })),
          }),
        ]);
        copied = "email";
      }
    } catch {
      copied = null;
    }

    const draft = await draftPromise;
    if (!draft) {
      tab?.close();
      showError(t.admin.mbGmailFailed);
      return;
    }

    // Nothing styled to paste: put the card on the clipboard instead, so it can still be pasted in.
    if (copied !== "email" && draft.card) {
      try {
        const blob = await (await fetch(draft.card)).blob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        copied = "card";
      } catch {
        copied = null;
      }
    }

    const params = new URLSearchParams({ view: "cm", fs: "1", to: member.customerEmail ?? draft.to, su: draft.subject });
    // With the styled email on the clipboard the body is left empty, so the paste lands in a clean message.
    if (copied !== "email") params.set("body", draft.body);
    if (draft.fromEmail) params.set("authuser", draft.fromEmail);
    const url = `https://mail.google.com/mail/?${params.toString()}`;
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");

    if (copied === "email") {
      success(t.admin.mbGmailHtmlCopied);
    } else if (copied === "card") {
      success(t.admin.mbGmailCopied);
    } else if (draft.card) {
      const link = document.createElement("a");
      link.href = draft.card;
      link.download = `membership-card-${member.membershipNumber}.png`;
      link.click();
      success(t.admin.mbGmailDownloaded);
    }
    if (!draft.fromEmail) showError(t.admin.mbGmailNoEmail);
  };

  /** Puts the member's card picture on the clipboard (or downloads it if the browser refuses), to paste into a message. */
  const copyCard = async (member: Member) => {
    if (!storeId) return;
    const draft = await getGmailComposeDraft(storeId, member.id);
    if (!draft?.card) {
      showError(t.admin.mbCardCopyFailed);
      return;
    }
    try {
      const blob = await (await fetch(draft.card)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      success(t.admin.mbCardCopiedMsg);
    } catch {
      const link = document.createElement("a");
      link.href = draft.card;
      link.download = `membership-card-${member.membershipNumber}.png`;
      link.click();
      success(t.admin.mbGmailDownloaded);
    }
  };

  const openNewLevel = () => {
    setEditingPlan(null);
    setLevelOpen(true);
  };

  const openEditLevel = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setLevelOpen(true);
  };

  const submitLevel = async (values: MembershipPlanInput) => {
    if (!storeId) return;
    setLevelSaving(true);
    try {
      const result = await saveMembershipPlan(storeId, editingPlan?.id ?? null, values);
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(t.admin.mbSaved);
      setLevelOpen(false);
      await load();
    } finally {
      setLevelSaving(false);
    }
  };

  const checkAuto = async () => {
    if (!storeId) return;
    setCheckingAuto(true);
    try {
      const result = await runAutoMembershipCheck(storeId);
      if (!result.success) {
        showError(result.error ?? t.admin.mbFailed);
        return;
      }
      success(
        (result.given ?? 0) > 0 ? t.admin.mbCheckDone.replace("{n}", String(result.given)) : t.admin.mbCheckNone,
      );
      await load();
    } finally {
      setCheckingAuto(false);
    }
  };

  const removeLevel = async (plan: MembershipPlan) => {
    if (!storeId) return;
    const result = await deleteMembershipPlan(storeId, plan.id);
    if (!result.success) {
      showError(result.error ?? t.admin.mbFailed);
      return;
    }
    success(t.admin.mbLevelDeleted);
    await load();
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
      active ? "bg-indigo-600 text-white" : "bg-card text-muted-foreground border border-border hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
            <Crown size={18} color="white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground m-0 tracking-tight leading-tight">{t.admin.mbTitle}</h1>
            <p className="text-xs text-muted-foreground m-0">{t.admin.mbSub}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-5">
        <div className="flex flex-wrap gap-2" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "members"} onClick={() => setTab("members")} className={tabClass(tab === "members")}>
            {t.admin.mbTabMembers}
          </button>
          <button type="button" role="tab" aria-selected={tab === "levels"} onClick={() => setTab("levels")} className={tabClass(tab === "levels")}>
            {t.admin.mbTabLevels}
          </button>
          <button type="button" role="tab" aria-selected={tab === "card"} onClick={() => setTab("card")} className={tabClass(tab === "card")}>
            {t.admin.mbTabCard}
          </button>
        </div>

        {tab === "card" ? (
          storeId ? <CardDesignTab storeId={storeId} canEdit={can("memberships.edit")} /> : null
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : tab === "members" ? (
          <MembersTab
            members={members}
            plans={plans}
            canAdd={can("memberships.add")}
            canEdit={can("memberships.edit")}
            canDelete={can("memberships.delete")}
            onAssign={openAssign}
            onEdit={openEditMember}
            onRemove={removeMember}
            onOpenGmail={openGmail}
            onCopyCard={copyCard}
            onGoLevels={() => setTab("levels")}
          />
        ) : (
          <LevelsTab
            plans={plans}
            categories={categories}
            canAdd={can("memberships.add")}
            canEdit={can("memberships.edit")}
            canDelete={can("memberships.delete")}
            onNew={openNewLevel}
            onEdit={openEditLevel}
            onDelete={removeLevel}
            onCheckAuto={checkAuto}
            checkingAuto={checkingAuto}
          />
        )}
      </div>

      <AssignMembershipModal
        open={assignOpen}
        editing={editingMember}
        plans={plans}
        saving={assignSaving}
        onSubmit={submitMembership}
        onCancel={() => setAssignOpen(false)}
      />
      <LevelFormModal
        open={levelOpen}
        editing={editingPlan}
        categories={categories}
        saving={levelSaving}
        onSubmit={submitLevel}
        onCancel={() => setLevelOpen(false)}
      />
    </div>
  );
}
