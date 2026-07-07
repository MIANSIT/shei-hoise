"use server";

import { getValidPathaoAccessToken } from "@/lib/utils/getValidPathaoAccessToken";
import {
  getCityList,
  getZoneList,
  getAreaList,
  type PathaoCity,
  type PathaoZone,
  type PathaoArea,
} from "@/lib/utils/pathaoApi";

export interface LocationResult<T> {
  success: boolean;
  data: T[];
  error?: string;
}

export async function getPathaoCities(
  credentialId: string,
): Promise<LocationResult<PathaoCity>> {
  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) return { success: false, data: [], error: tokenResult.error };

  const result = await getCityList(tokenResult.environment, tokenResult.accessToken);
  if (!result.ok) return { success: false, data: [], error: result.error };

  return { success: true, data: result.data.data.data ?? [] };
}

export async function getPathaoZones(
  credentialId: string,
  cityId: number,
): Promise<LocationResult<PathaoZone>> {
  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) return { success: false, data: [], error: tokenResult.error };

  const result = await getZoneList(tokenResult.environment, tokenResult.accessToken, cityId);
  if (!result.ok) return { success: false, data: [], error: result.error };

  return { success: true, data: result.data.data.data ?? [] };
}

export async function getPathaoAreas(
  credentialId: string,
  zoneId: number,
): Promise<LocationResult<PathaoArea>> {
  const tokenResult = await getValidPathaoAccessToken(credentialId);
  if (!tokenResult.ok) return { success: false, data: [], error: tokenResult.error };

  const result = await getAreaList(tokenResult.environment, tokenResult.accessToken, zoneId);
  if (!result.ok) return { success: false, data: [], error: result.error };

  return { success: true, data: result.data.data.data ?? [] };
}
