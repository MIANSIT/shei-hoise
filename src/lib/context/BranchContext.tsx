"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBranchSetup } from "@/lib/queries/branches/manageBranches";
import type { BranchItem, BranchSetup } from "@/lib/queries/branches/types";

type LoadedSetup = Extract<BranchSetup, { ok: true }>;

interface BranchState {
  loading: boolean;
  /** Plan has multi_branch AND the store has turned branches on. */
  enabled: boolean;
  /** Plan has multi_branch (branches may not be turned on yet). */
  featureEnabled: boolean;
  setup: LoadedSetup | null;
  /** Branches this person can see (staff: their assigned ones). */
  branches: BranchItem[];
  activeBranches: BranchItem[];
  /** null = "All branches". */
  selectedBranchId: string | null;
  selectedBranch: BranchItem | null;
  setSelectedBranchId: (id: string | null) => void;
  /**
   * The branch you sell and work from (Quick Sale). Follows the header when a
   * branch is picked there; with "All branches" it's the last one used, so
   * the counter never has to switch the whole dashboard.
   */
  workBranchId: string | null;
  workBranch: BranchItem | null;
  setWorkBranchId: (id: string) => void;
  canSeeAllBranches: boolean;
  branchName: (id: string | null | undefined) => string;
  /** "-niketon" for the selected branch, "" on "All branches" or without branches — appended to export file names. */
  branchFileSuffix: string;
  refresh: () => Promise<void>;
}

const BranchContext = createContext<BranchState | null>(null);

const storageKey = (userKey: string) => `shei-branch:${userKey}`;
const workStorageKey = (userKey: string) => `shei-work-branch:${userKey}`;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the choice just won't persist.
  }
}

interface BranchProviderProps {
  children: React.ReactNode;
  /** Signed-in user id; the chosen branch is remembered per person. */
  userKey: string | null;
}

/**
 * Which branch the dashboard is looking at. The choice is remembered per
 * user. Staff limited to some branches never get "All branches".
 */
export function BranchProvider({ children, userKey }: BranchProviderProps) {
  const [setup, setSetup] = useState<LoadedSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelected] = useState<string | null>(null);
  const [workBranchId, setWork] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBranchSetup();
      setSetup(result.ok ? result : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userKey) {
      setSetup(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [userKey, refresh]);

  // Restore (or default) the selection once branches are known.
  useEffect(() => {
    if (!setup || !userKey) return;
    const ids = new Set(setup.branches.map((b) => b.id));
    const activeIds = new Set(setup.branches.filter((b) => b.isActive).map((b) => b.id));
    const firstActive = setup.branches.find((b) => b.isActive)?.id ?? setup.branches[0]?.id ?? null;
    const stored = readStored(storageKey(userKey));
    let selected: string | null;
    if (stored && stored !== "all" && ids.has(stored)) {
      selected = stored;
    } else if (setup.canSeeAllBranches) {
      selected = null;
    } else {
      selected = firstActive;
    }
    setSelected(selected);
    const storedWork = readStored(workStorageKey(userKey));
    setWork(selected ?? (storedWork && activeIds.has(storedWork) ? storedWork : firstActive));
  }, [setup, userKey]);

  const setSelectedBranchId = useCallback(
    (id: string | null) => {
      if (id === null && setup && !setup.canSeeAllBranches) return;
      setSelected(id);
      if (userKey) writeStored(storageKey(userKey), id ?? "all");
      // Picking a branch in the header also makes it the one you work from.
      if (id) {
        setWork(id);
        if (userKey) writeStored(workStorageKey(userKey), id);
      }
    },
    [setup, userKey],
  );

  const setWorkBranchId = useCallback(
    (id: string) => {
      if (setup && !setup.branches.some((b) => b.id === id)) return;
      setWork(id);
      if (userKey) writeStored(workStorageKey(userKey), id);
    },
    [setup, userKey],
  );

  const value = useMemo<BranchState>(() => {
    const branches = setup?.branches ?? [];
    const names = new Map(branches.map((b) => [b.id, b.name]));
    return {
      loading,
      enabled: !!setup && setup.featureEnabled && setup.branchesOn,
      featureEnabled: !!setup?.featureEnabled,
      setup,
      branches,
      activeBranches: branches.filter((b) => b.isActive),
      selectedBranchId,
      selectedBranch: branches.find((b) => b.id === selectedBranchId) ?? null,
      setSelectedBranchId,
      workBranchId,
      workBranch: branches.find((b) => b.id === workBranchId) ?? null,
      setWorkBranchId,
      canSeeAllBranches: setup?.canSeeAllBranches ?? true,
      branchName: (id) => (id ? (names.get(id) ?? "") : ""),
      branchFileSuffix: (() => {
        const branch = setup?.branchesOn ? branches.find((b) => b.id === selectedBranchId) : undefined;
        const slug = branch?.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        return slug ? `-${slug}` : "";
      })(),
      refresh,
    };
  }, [setup, loading, selectedBranchId, setSelectedBranchId, workBranchId, setWorkBranchId, refresh]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

/**
 * Current branch selection and the store's branches. Outside the dashboard
 * provider it reports branches as off, so shared components behave as before.
 * @returns branch list, selection and helpers
 */
export function useBranches(): BranchState {
  const ctx = useContext(BranchContext);
  if (ctx) return ctx;
  return {
    loading: false,
    enabled: false,
    featureEnabled: false,
    setup: null,
    branches: [],
    activeBranches: [],
    selectedBranchId: null,
    selectedBranch: null,
    setSelectedBranchId: () => {},
    workBranchId: null,
    workBranch: null,
    setWorkBranchId: () => {},
    canSeeAllBranches: true,
    branchName: () => "",
    branchFileSuffix: "",
    refresh: async () => {},
  };
}
