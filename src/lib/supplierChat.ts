import { AppLanguage } from "./i18n";

export type SupplierChatSenderRole = "buyer" | "supplier";

export type SupplierChatApiMessage = {
  id: string;
  supplierId: string;
  senderRole: SupplierChatSenderRole;
  senderName: string;
  text: string;
  createdAt: number;
  originalText?: string;
  viewerLanguage?: AppLanguage;
  isTranslated?: boolean;
};

export type SupplierChatApiResponse = {
  success?: boolean;
  error?: string;
  messages?: SupplierChatApiMessage[];
  message?: SupplierChatApiMessage;
};

export const readSupplierChatApiResponse = async (
  response: Response
): Promise<SupplierChatApiResponse> => {
  const raw = await response.text();

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as SupplierChatApiResponse;
  } catch {
    const contentType = response.headers.get("content-type") ?? "unknown content type";
    return {
      success: false,
      error: `Supplier chat API returned invalid JSON (${contentType}, HTTP ${response.status}).`,
    };
  }
};
