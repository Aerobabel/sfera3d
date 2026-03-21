import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractAccessTokenFromRequest,
  getSupplierIdFromUser,
  getSupplierNameFromUser,
  getUserDisplayName,
  getUserRole,
  type AppAuthRole,
} from "@/lib/auth/shared";

export type AuthenticatedAppUser = {
  id: string;
  email: string | null;
  role: AppAuthRole;
  displayName: string;
  supplierId: string | null;
  supplierName: string | null;
  accessToken: string;
  user: User;
};

export const authenticateAppRequest = async (
  request: Pick<Request, "headers">
): Promise<AuthenticatedAppUser | null> => {
  const accessToken = extractAccessTokenFromRequest(request);
  if (!accessToken) return null;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role: getUserRole(data.user),
    displayName: getUserDisplayName(data.user),
    supplierId: getSupplierIdFromUser(data.user),
    supplierName: getSupplierNameFromUser(data.user),
    accessToken,
    user: data.user,
  };
};
