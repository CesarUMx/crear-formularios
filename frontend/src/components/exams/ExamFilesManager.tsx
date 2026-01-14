import { useState } from 'react';
import { examService } from '../../lib/examService';
import { fileService } from '../../lib/fileService';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Download,
  Eye
} from 'lucide-react';

interface ExamFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface ExamFilesManagerProps {
  examId: string;
  files: ExamFile[];
  onFilesChange: () => void;
}

export default function ExamFilesManager({ examId, files, onFilesChange }: ExamFilesManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-blue-600" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-600" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-green-600" />;
    if (fileType === 'application/pdf') return <FileText className="w-5 h-5 text-red-600" />;
    return <File className="w-5 h-5 text-gray-600" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setSuccess('');

    // Validar tamaño (máximo 100MB para archivos de apoyo - videos/audios)
    const maxSize = 100 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('El archivo excede el tamaño máximo de 100MB');
      return;
    }

    await uploadFile(selectedFile);
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setError('');
      setProgress(0);

      // Subir archivo al servidor
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/exams/${examId}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir el archivo');
      }

      const uploadResult = await response.json();

      // Guardar referencia en el examen
      await examService.uploadSupportFile(examId, {
        fileName: uploadResult.fileName || file.name,
        fileUrl: uploadResult.fileUrl || uploadResult.url,
        fileType: uploadResult.fileType || file.type,
        fileSize: uploadResult.fileSize || file.size
      });

      setSuccess('Archivo subido exitosamente');
      setProgress(0);
      onFilesChange();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${fileName}"?`)) return;

    try {
      await examService.deleteSupportFile(examId, fileId);
      setSuccess('Archivo eliminado exitosamente');
      onFilesChange();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar archivo');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Archivos de Apoyo</h3>
        <span className="text-sm text-gray-600">
          {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
        </span>
      </div>

      {/* Upload Area */}
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
              disabled={uploading}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            
            {uploading ? (
              <div className="space-y-3">
                <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Subiendo archivo...</p>
                  <div className="mt-2 w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
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
                  <p>Tipos: PDF, imágenes, videos, audio, documentos</p>
                  <p>Tamaño máximo: 50MB</p>
                </div>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Archivos Subidos</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition"
              >
                {getFileIcon(file.fileType)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.fileName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{file.fileType}</span>
                    <span>•</span>
                    <span>{fileService.formatFileSize(file.fileSize)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Ver archivo"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  
                  <a
                    href={file.fileUrl}
                    download={file.fileName}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleDeleteFile(file.id, file.fileName)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No hay archivos de apoyo. Los archivos que subas estarán disponibles para los estudiantes al tomar el examen.
        </div>
      )}
    </div>
  );
}
