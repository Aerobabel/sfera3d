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
