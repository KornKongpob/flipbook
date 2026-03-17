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
    if (file && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setFileName(file.name);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName(null);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200",
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
        className="sr-only"
      />

      {fileName ? (
        <>
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{fileName}</p>
            <p className="text-xs text-muted">Ready to upload</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-gray-100 hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
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
    </div>
  );
}
