import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "supplier-intake";
const SUBMISSIONS_PREFIX = "submissions";
const MAX_ARCHIVE_BYTES = 350 * 1024 * 1024;

const ACCEPTED_ARCHIVE_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

type SubmissionStatus = "received" | "in_review" | "approved" | "needs_update";

type AuthenticatedUser = {
  id: string;
  email: string;
  supplierName: string;
};

type SubmissionRecord = {
  id: string;
  ownerId: string;
  supplierName: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  productName: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  minOrderQty: string;
  stockQty: string;
  warranty: string;
  dimensions: string;
  weight: string;
  colors: string;
  notes: string;
  archivePath: string;
  status: SubmissionStatus;
  createdAt: string;
};

const jsonError = (status: number, error: string) =>
  NextResponse.json({ success: false, error }, { status });

const toTrimmedString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeSegment = (value: string) => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "item";
};

const extractToken = (request: Request) => {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const authenticate = async (
  request: Request,
  supabase: SupabaseClient
): Promise<AuthenticatedUser | null> => {
  const token = extractToken(request);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const metadata =
    data.user.user_metadata && typeof data.user.user_metadata === "object"
      ? (data.user.user_metadata as Record<string, unknown>)
      : {};

  const supplierNameFromMetadata =
    typeof metadata.supplier_name === "string" && metadata.supplier_name.trim().length > 0
      ? metadata.supplier_name.trim()
      : "";

  const email = data.user.email?.trim() ?? "";
  const supplierName =
    supplierNameFromMetadata || email.split("@")[0]?.replace(/[._-]/g, " ") || "Supplier";

  return {
    id: data.user.id,
    email,
    supplierName,
  };
};

const ensureIntakeBucket = async (supabase: SupabaseClient) => {
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(error.message || "Unable to access storage buckets.");
  }

  const existingBucket = (buckets ?? []).find((bucket) => bucket.name === BUCKET_NAME);
  if (existingBucket) {
    // Do not force-update bucket settings on every request. Existing deployments may
    // have stricter project caps, and update attempts can fail even before upload.
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: MAX_ARCHIVE_BYTES,
    allowedMimeTypes: Array.from(ACCEPTED_ARCHIVE_TYPES),
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    if (message.includes("maximum allowed size")) {
      // Retry without explicit fileSizeLimit so Supabase applies project defaults.
      const { error: fallbackCreateError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: Array.from(ACCEPTED_ARCHIVE_TYPES),
      });

      if (
        fallbackCreateError &&
        !fallbackCreateError.message.toLowerCase().includes("already")
      ) {
        throw new Error(
          fallbackCreateError.message || "Unable to create intake storage bucket."
        );
      }
      return;
    }

    if (!message.includes("already")) {
      throw new Error(createError.message || "Unable to create intake storage bucket.");
    }
  }
};

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const user = await authenticate(request, supabase);

    if (!user) {
      return jsonError(401, "Unauthorized. Sign in and retry.");
    }

    await ensureIntakeBucket(supabase);

    const ownerPrefix = `${SUBMISSIONS_PREFIX}/${user.id}`;
    const { data: folders, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(ownerPrefix, { limit: 100, offset: 0, sortBy: { column: "name", order: "desc" } });

    if (error) {
      if (error.message.toLowerCase().includes("not found")) {
        return NextResponse.json({ success: true, submissions: [] });
      }
      return jsonError(500, error.message || "Failed to load submissions.");
    }

    const submissions: SubmissionRecord[] = [];

    for (const folder of folders ?? []) {
      const metadataPath = `${ownerPrefix}/${folder.name}/submission.json`;
      const { data: metadataFile, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(metadataPath);

      if (downloadError || !metadataFile) {
        continue;
      }

      try {
        const text = await metadataFile.text();
        const parsed = JSON.parse(text) as SubmissionRecord;
        submissions.push(parsed);
      } catch {
        // Ignore malformed files and continue.
      }
    }

    submissions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return NextResponse.json({ success: true, submissions });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to load submissions.";
    return jsonError(500, errorMessage);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdminClient();
    const authenticatedUser = await authenticate(request, supabase);

    await ensureIntakeBucket(supabase);

    const formData = await request.formData();

    const archive = formData.get("archive");
    if (!(archive instanceof File)) {
      return jsonError(400, "Archive file is required.");
    }

    if (archive.size <= 0) {
      return jsonError(400, "Archive file is empty.");
    }

    if (archive.size > MAX_ARCHIVE_BYTES) {
      return jsonError(400, "Archive exceeds 350MB limit.");
    }

    const archiveType = archive.type.trim();
    const hasZipExtension = archive.name.toLowerCase().endsWith(".zip");
    if (archiveType && !ACCEPTED_ARCHIVE_TYPES.has(archiveType)) {
      return jsonError(400, "Only ZIP archives are accepted.");
    }
    if (!archiveType && !hasZipExtension) {
      return jsonError(400, "Only ZIP archives are accepted.");
    }
    const uploadContentType = archiveType || "application/zip";

    const supplierName =
      toTrimmedString(formData.get("supplierName")) ||
      authenticatedUser?.supplierName ||
      "Supplier";
    const companyName = toTrimmedString(formData.get("companyName"));
    const contactName = toTrimmedString(formData.get("contactName"));
    const contactEmail =
      toTrimmedString(formData.get("contactEmail")) ||
      authenticatedUser?.email ||
      "";
    const phone = toTrimmedString(formData.get("phone"));
    const productName = toTrimmedString(formData.get("productName"));
    const sku = toTrimmedString(formData.get("sku"));
    const description = toTrimmedString(formData.get("description"));
    const price = toTrimmedString(formData.get("price"));
    const currency = toTrimmedString(formData.get("currency")) || "USD";
    const minOrderQty = toTrimmedString(formData.get("minOrderQty"));
    const stockQty = toTrimmedString(formData.get("stockQty"));
    const warranty = toTrimmedString(formData.get("warranty"));
    const dimensions = toTrimmedString(formData.get("dimensions"));
    const weight = toTrimmedString(formData.get("weight"));
    const colors = toTrimmedString(formData.get("colors"));
    const notes = toTrimmedString(formData.get("notes"));

    if (!contactEmail) {
      return jsonError(400, "contactEmail is required.");
    }

    const normalizedProductName = productName || "Multi-product package";
    const normalizedSku = sku || "package";

    const submissionId = crypto.randomUUID();
    const ownerId = authenticatedUser?.id ?? "public";
    const ownerPrefix = authenticatedUser
      ? `${SUBMISSIONS_PREFIX}/${ownerId}/${submissionId}`
      : `${SUBMISSIONS_PREFIX}/public/${submissionId}`;
    const archiveName = `${sanitizeSegment(normalizedSku)}-submission.zip`;
    const archivePath = `${ownerPrefix}/${archiveName}`;

    const archiveBytes = new Uint8Array(await archive.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(archivePath, archiveBytes, {
        contentType: uploadContentType,
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("maximum allowed size")) {
        return jsonError(
          400,
          "Archive exceeds the current Supabase bucket object-size limit."
        );
      }
      return jsonError(500, uploadError.message || "Failed to upload archive.");
    }

    const submission: SubmissionRecord = {
      id: submissionId,
      ownerId,
      supplierName,
      companyName,
      contactName,
      contactEmail,
      phone,
      productName: normalizedProductName,
      sku: normalizedSku,
      description,
      price,
      currency,
      minOrderQty,
      stockQty,
      warranty,
      dimensions,
      weight,
      colors,
      notes,
      archivePath,
      status: "received",
      createdAt: new Date().toISOString(),
    };

    const metadataPath = `${ownerPrefix}/submission.json`;
    const metadataBytes = new TextEncoder().encode(JSON.stringify(submission, null, 2));

    let { error: metadataError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(metadataPath, metadataBytes, {
        contentType: "application/json",
        upsert: true,
      });

    if (metadataError?.message.toLowerCase().includes("mime type")) {
      // Some buckets allow only archive MIME types. Retry metadata upload with
      // octet-stream so submission does not fail after archive upload succeeds.
      const retry = await supabase.storage
        .from(BUCKET_NAME)
        .upload(metadataPath, metadataBytes, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      metadataError = retry.error;
    }

    if (metadataError) {
      return jsonError(500, metadataError.message || "Failed to write submission metadata.");
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to submit supplier package.";
    return jsonError(500, errorMessage);
  }
}
