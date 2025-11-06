import { useState } from 'react';
import { fileService } from '../../lib/fileService';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface FileInputProps {
  questionId: string;
  formId: string;
  responseId: string;
  allowedFileTypes?: string;
  maxFileSize?: number;
  isRequired: boolean;
  onChange: (fileUrl: string, fileName: string, fileSize: number) => void;
}

export default function FileInput({
  questionId,
  formId,
  responseId,
  allowedFileTypes,
  maxFileSize = 10,
  isRequired,
  onChange
}: FileInputProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState<{ url: string; name: string; size: number } | null>(null);

  const getAcceptedTypes = () => {
    if (!allowedFileTypes) return '*';

    const types = allowedFileTypes.split(',').map(t => t.trim());
    const mimeTypes: string[] = [];

    if (types.includes('IMAGE')) {
      mimeTypes.push('image/*');
    }
    if (types.includes('PDF')) {
      mimeTypes.push('application/pdf');
    }
    if (types.includes('EXCEL')) {
      mimeTypes.push('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel');
    }

    return mimeTypes.join(',');
  };

  const getAllowedTypesLabel = () => {
    if (!allowedFileTypes) return 'Cualquier archivo';

    const types = allowedFileTypes.split(',').map(t => t.trim());
    const labels: string[] = [];

    if (types.includes('IMAGE')) labels.push('Imágenes');
    if (types.includes('PDF')) labels.push('PDF');
    if (types.includes('EXCEL')) labels.push('Excel');

    return labels.join(', ');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);

    // Validar archivo
    const validation = fileService.validateFile(selectedFile, allowedFileTypes, maxFileSize);
    if (!validation.valid) {
      setError(validation.error || 'Archivo inválido');
      setFile(null);
      return;
    }

    // Subir archivo automáticamente
    await uploadFile(selectedFile);
  };

  const uploadFile = async (fileToUpload: File) => {
    try {
      setUploading(true);
      setError('');
      setProgress(0);

      const result = await fileService.uploadFile(
        fileToUpload,
        questionId,
        responseId,
        formId,
        (progressInfo) => {
          setProgress(progressInfo.percentage);
        }
      );

      setUploaded(true);
      setFileInfo({
        url: result.file.url,
        name: result.file.name,
        size: result.file.size
      });

      // Notificar al padre
      onChange(result.file.url, result.file.name, result.file.size);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo');
      setFile(null);
      setUploaded(false);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setUploaded(false);
    setFileInfo(null);
    setProgress(0);
    setError('');
    onChange('', '', 0);
  };

  return (
    <div className="space-y-2">
      {!uploaded ? (
        <div>
          <label className="block">
            <div className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
              ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <input
                type="file"
                onChange={handleFileSelect}
                accept={getAcceptedTypes()}
                disabled={uploading}
                className="hidden"
              />
              
              {uploading ? (
                <div className="space-y-3">
                  <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Subiendo archivo...</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{progress}%</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Click para seleccionar archivo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      o arrastra y suelta aquí
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Tipos permitidos: {getAllowedTypesLabel()}</p>
                    <p>Tamaño máximo: {maxFileSize}MB</p>
                  </div>
                </div>
              )}
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <File className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-900 truncate">
                {fileInfo?.name}
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              {fileService.formatFileSize(fileInfo?.size || 0)} - Subido exitosamente
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition"
            title="Eliminar archivo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
