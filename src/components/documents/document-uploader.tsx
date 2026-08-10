"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/config/app";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatBytes, humanizeEnum } from "@/lib/utils/format";
import { DOCUMENT_TYPES } from "@/types/domain";
import type { ApiResponse } from "@/types/common";

interface PreparedUpload {
  storagePath: string;
  token: string;
  bucket: string;
}

/**
 * Upload dialog.
 *
 * Three steps: ask the server for a signed URL, PUT the bytes straight to
 * storage, then confirm the metadata. The client checks type and size first as
 * a courtesy — the server checks again and is the actual gate.
 */
export function DocumentUploader({ canUpload }: { canUpload: boolean }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("GL_STATEMENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  function reset() {
    setFile(null);
    setError(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onSelectFile(selected: File | null) {
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_UPLOAD_BYTES) {
      setError(`File is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      setFile(null);
      return;
    }

    if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(selected.type)) {
      setError(
        `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}.`,
      );
      setFile(null);
      return;
    }

    setFile(selected);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const prepareResponse = await fetch("/api/documents/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          document_type: documentType,
        }),
      });

      const prepared = (await prepareResponse.json()) as ApiResponse<PreparedUpload>;
      if (!prepared.ok) {
        setError(prepared.error.message);
        setBusy(false);
        return;
      }

      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError("Storage is unavailable because Supabase is not configured.");
        setBusy(false);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from(prepared.data.bucket)
        .uploadToSignedUrl(prepared.data.storagePath, prepared.data.token, file);

      if (uploadError) {
        setError("The file could not be transferred to storage.");
        setBusy(false);
        return;
      }

      const confirmResponse = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: prepared.data.storagePath,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          documentType,
        }),
      });

      const confirmed = (await confirmResponse.json()) as ApiResponse<unknown>;
      if (!confirmed.ok) {
        setError(confirmed.error.message);
        setBusy(false);
        return;
      }

      toast({ tone: "success", title: `${file.name} was uploaded.` });
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("The upload failed. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={!canUpload}>
        <Upload />
        Upload document
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        size="sm"
        title="Upload document"
        description="Files are stored in a private bucket and served through short-lived signed links."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={upload} loading={busy} disabled={!file}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-danger/25 bg-danger-subtle px-3.5 py-2.5 text-xs leading-relaxed text-fg"
            >
              {error}
            </div>
          ) : null}

          <FormField label="Document type" htmlFor="document_type" required>
            <Select
              id="document_type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {humanizeEnum(type)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="File"
            htmlFor="file"
            required
            hint={`${ALLOWED_UPLOAD_EXTENSIONS.join(", ")} · up to ${formatBytes(MAX_UPLOAD_BYTES)}`}
          >
            <input
              ref={inputRef}
              id="file"
              type="file"
              data-autofocus
              accept={ALLOWED_UPLOAD_EXTENSIONS.join(",")}
              onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border-default bg-surface px-3 py-2 text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-fg"
            />
          </FormField>

          {file ? (
            <p className="text-xs text-fg-muted">
              Selected: <span className="font-medium text-fg">{file.name}</span> ·{" "}
              {formatBytes(file.size)}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-fg-subtle">
            Text extraction and OCR are not part of this phase. Uploaded files are
            stored and listed only.
          </p>
        </div>
      </Modal>
    </>
  );
}
