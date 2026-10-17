import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils/cn';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 2;

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  errorMessage?: string;
}

export const ImageUploadField = ({
  value,
  onChange,
  invalid,
  errorMessage,
}: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Chỉ chấp nhận JPG, PNG hoặc WEBP';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Ảnh tối đa ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    // Mock upload: dùng blob URL local. Khi có API thật → gọi productsApi.uploadImage(file)
    const blobUrl = URL.createObjectURL(file);
    onChange(blobUrl);
  };

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset input để chọn lại cùng file vẫn trigger onChange
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onClear = () => {
    onChange('');
    setLocalError(null);
  };

  const displayedError = localError || (invalid ? errorMessage : null);

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100',
          displayedError && 'border-red-400 bg-red-50/40'
        )}
      >
        <div className="text-3xl text-slate-400">📷</div>
        <p className="text-sm font-medium text-slate-700">
          Kéo & thả ảnh vào đây, hoặc <span className="text-emerald-600 underline">chọn file</span>
        </p>
        <p className="text-xs text-slate-500">
          JPG · PNG · WEBP — tối đa {MAX_SIZE_MB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={onPickFile}
        />
      </div>

      {/* Hoặc nhập URL */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">hoặc</span>
        <Input
          placeholder="Dán URL ảnh: https://…"
          value={value.startsWith('blob:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          invalid={!!displayedError}
        />
      </div>

      {/* Preview */}
      {value && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
            <img
              src={value}
              alt="preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs text-slate-500">
              {value.startsWith('blob:') ? 'Ảnh đã tải lên (local preview)' : value}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} type="button">
            Xóa
          </Button>
        </div>
      )}

      {displayedError && (
        <p className="text-xs text-red-500">{displayedError}</p>
      )}
    </div>
  );
};
