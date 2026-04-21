import { FileText, Download, Image, Film, Music } from 'lucide-react';

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  className?: string;
}

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

function getFullUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http')) return fileUrl;
  const fullUrl = `${API_BASE}${fileUrl}`;
  console.log('📎 FileAttachment - Building URL:', {
    fileUrl,
    API_BASE,
    fullUrl,
    PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL
  });
  return fullUrl;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

function isAudio(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export default function FileAttachment({ fileUrl, fileName, fileType, className = '' }: FileAttachmentProps) {
  const url = getFullUrl(fileUrl);

  if (isImage(fileType)) {
    return (
      <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`}>
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-80 object-contain mx-auto"
          loading="lazy"
        />
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-xs text-gray-500">
          <Image className="w-3.5 h-3.5" />
          <span className="truncate">{fileName}</span>
        </div>
      </div>
    );
  }

  if (isVideo(fileType)) {
    return (
      <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`}>
        <video
          src={url}
          controls
          className="max-w-full max-h-96 mx-auto"
          preload="metadata"
        >
          Tu navegador no soporta la reproducción de video.
        </video>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-xs text-gray-500">
          <Film className="w-3.5 h-3.5" />
          <span className="truncate">{fileName}</span>
        </div>
      </div>
    );
  }

  if (isAudio(fileType)) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 ${className}`}>
        <Music className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{fileName}</p>
          <audio src={url} controls className="w-full mt-2" preload="metadata">
            Tu navegador no soporta la reproducción de audio.
          </audio>
        </div>
      </div>
    );
  }

  // PDF, Excel u otro archivo: enlace de descarga
  const Icon = isPdf(fileType) ? FileText : Download;
  const label = isPdf(fileType) ? 'PDF' : 'Archivo';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition ${className}`}
    >
      <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{fileName}</p>
        <p className="text-xs text-gray-400">{label} - Clic para abrir</p>
      </div>
      <Download className="w-4 h-4 text-gray-400" />
    </a>
  );
}
