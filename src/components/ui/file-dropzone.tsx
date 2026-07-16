"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  name: string;
  accept: string;
  required?: boolean;
  id?: string;
}

export function FileDropzone({ name, accept, required, id }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isAcceptedFile(file: File) {
    const acceptedTypes = accept.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    return acceptedTypes.some((value) =>
      value.startsWith(".")
        ? file.name.toLowerCase().endsWith(value)
        : file.type.toLowerCase() === value,
    );
  }

  function selectFile(file: File) {
    if (!isAcceptedFile(file)) {
      if (inputRef.current) inputRef.current.value = "";
      setFileName(null);
      setError(`Choose a supported file (${accept}).`);
      return;
    }

    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
    setError(null);
    setFileName(file.name);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    } else {
      setFileName(null);
    }
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName(null);
    setError(null);
  }

  function handleOpen() {
    inputRef.current?.click();
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
        isDragging
          ? "border-brand bg-brand-soft/40 scale-[1.01]"
          : fileName
            ? "border-brand/40 bg-brand-soft/20"
            : "border-gray-200 bg-gray-50/50 hover:border-brand/30 hover:bg-brand-soft/10",
      )}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={handleChange}
        aria-describedby={`${id ?? name}-file-help${error ? ` ${id ?? name}-file-error` : ""}`}
        className="sr-only"
      />

      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-4"
        aria-label={fileName ? `Selected file ${fileName}. Choose another file.` : "Choose Excel workbook"}
      >
      {fileName ? (
        <>
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{fileName}</p>
            <p className="text-xs text-muted">Ready to upload</p>
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            "flex size-12 items-center justify-center rounded-xl transition-colors",
            isDragging ? "bg-brand text-white" : "bg-gray-100 text-muted-strong group-hover:bg-brand-soft group-hover:text-brand",
          )}>
            <Upload className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop file here" : "Drop file or click to browse"}
            </p>
            <p className="mt-0.5 text-xs text-muted">Excel workbook (.xlsx)</p>
          </div>
        </>
      )}
      </button>
      {fileName ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={`Remove ${fileName}`}
          className="absolute right-3 top-3 rounded-md p-1 text-muted transition hover:bg-gray-100 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <p id={`${id ?? name}-file-help`} className="sr-only">Only files matching {accept} are accepted.</p>
      {error ? (
        <p id={`${id ?? name}-file-error`} role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
