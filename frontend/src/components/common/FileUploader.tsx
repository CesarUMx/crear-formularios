import { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Film, Music } from 'lucide-react';

interface FileUploaderProps {
  currentFile?: { url: string; name: string; type: string } | null;
  pendingFile?: File | null; // Archivo local seleccionado pero no subido
  onUpload: (file: File) => void;
  onRemove: () => void;
  acceptedTypes?: string[];
  maxSize?: number; // bytes
  disabled?: boolean;
}

const DEFAULT_ACCEPTED = ['mp3', 'mp4', 'jpg', 'jpeg', 'gif', 'png', 'pdf', 'xlsx', 'xls'];
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

function getAcceptString(types: string[]): string {
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    png: 'image/png',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
  };
  return types.map(t => mimeMap[t] || `.${t}`).join(',');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  return FileText;
}

export default function FileUploader({
  currentFile,
  pendingFile,
  onUpload,
  onRemove,
  acceptedTypes = DEFAULT_ACCEPTED,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
}: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    // Validar extensión
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!acceptedTypes.includes(ext)) {
      setError(`Tipo no permitido. Aceptados: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validar tamaño
    if (file.size > maxSize) {
      setError(`El archivo excede el límite de ${formatFileSize(maxSize)}`);
      return;
    }

    onUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Si hay archivo pendiente (local), mostrarlo con preview
  if (pendingFile) {
    const Icon = getFileIcon(pendingFile.type);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-300 bg-blue-50">
          <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span className="flex-1 text-sm text-gray-700 truncate">{pendingFile.name}</span>
          <span className="text-xs text-gray-500">{formatFileSize(pendingFile.size)}</span>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 transition"
              title="Eliminar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {pendingFile.type.startsWith('image/') && (
          <img 
            src={URL.createObjectURL(pendingFile)} 
            alt="Preview" 
            className="max-w-full max-h-48 rounded border border-gray-200"
          />
        )}
        <p className="text-xs text-blue-600 italic">
          Este archivo se subirá al guardar el examen
        </p>
      </div>
    );
  }

  // Si hay archivo guardado (del servidor), mostrarlo
  if (currentFile) {
    const Icon = getFileIcon(currentFile.type);
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
        <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-gray-700 truncate">{currentFile.name}</span>
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 transition"
            title="Eliminar archivo"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed transition cursor-pointer
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <Upload className="w-5 h-5 text-gray-400" />
        <p className="text-sm text-gray-500">
          Arrastra un archivo o haz clic para seleccionar
        </p>
        <p className="text-xs text-gray-400">
          {acceptedTypes.join(', ').toUpperCase()} - Max {formatFileSize(maxSize)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptString(acceptedTypes)}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
