import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  ExternalLink,
  Maximize2,
} from 'lucide-react';

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  className?: string;
}

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

function getFullUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_BASE}${fileUrl}`;
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

type Kind = 'image' | 'video' | 'audio' | 'pdf' | 'excel' | 'other';

function detectKind(fileType: string, fileName: string): Kind {
  const mt = (fileType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  if (mt.startsWith('audio/')) return 'audio';
  if (mt === 'application/pdf') return 'pdf';
  if (
    mt === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mt === 'application/vnd.ms-excel'
  )
    return 'excel';

  // Fallback por extensión si fileType viene vacío o genérico
  const ext = getExt(fileName);
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogv', 'mov', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  return 'other';
}

export default function FileAttachment({
  fileUrl,
  fileName,
  fileType,
  className = '',
}: FileAttachmentProps) {
  const url = getFullUrl(fileUrl);
  const kind = detectKind(fileType, fileName);
  const [imgOpen, setImgOpen] = useState(false);

  // ==================== IMAGEN ====================
  if (kind === 'image') {
    return (
      <>
        <div className={`rounded-lg overflow-hidden border border-gray-200 bg-white ${className}`}>
          <div
            onClick={() => setImgOpen(true)}
            className="block w-full cursor-zoom-in bg-gray-50"
            title="Ampliar imagen"
            role="button"
            tabIndex={0}
          >
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-80 object-contain mx-auto block"
              loading="lazy"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-xs text-gray-600 border-t border-gray-200">
            <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
        </div>

        {imgOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setImgOpen(false)}
          >
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </>
    );
  }

  // ==================== VIDEO ====================
  if (kind === 'video') {
    return (
      <div className={`rounded-lg overflow-hidden border border-gray-200 bg-black ${className}`}>
        <video
          src={url}
          controls
          controlsList="nodownload"
          playsInline
          className="block w-full max-h-[70vh] bg-black"
          preload="metadata"
        >
          Tu navegador no soporta la reproducción de video.
        </video>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-900 text-xs text-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <Film className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // ==================== AUDIO ====================
  if (kind === 'audio') {
    return (
      <div
        className={`rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 ${className}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
            <p className="text-xs text-gray-500">Archivo de audio</p>
          </div>
        </div>
        <audio
          src={url}
          controls
          controlsList="nodownload"
          className="w-full"
          preload="metadata"
          style={{ minHeight: 40 }}
        >
          Tu navegador no soporta la reproducción de audio.
        </audio>
      </div>
    );
  }

  // ==================== PDF ====================
  if (kind === 'pdf') {
    return (
      <div className={`rounded-lg overflow-hidden border border-gray-200 bg-white ${className}`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">{fileName}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition"
            title="Abrir en nueva pestaña"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
        </div>
        <iframe
          src={`${url}#toolbar=1&view=FitH`}
          title={fileName}
          className="w-full"
          style={{ height: '70vh', minHeight: 480, border: 0 }}
        />
      </div>
    );
  }

  // ==================== EXCEL ====================
  if (kind === 'excel') {
    const isHttp = url.startsWith('http://') || url.startsWith('https://');
    // Office Online solo puede alcanzar URLs publicas en HTTPS.
    // Bloqueamos localhost e IPs privadas (10.x, 172.16-31.x, 192.168.x).
    const isHttps = url.startsWith('https://');
    const isPrivateHost = /\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(url);
    const canPreview = isHttp && isHttps && !isPrivateHost;
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

    return (
      <div className={`rounded-lg overflow-hidden border border-gray-200 bg-white ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">{fileName}</span>
        </div>
        {canPreview ? (
          <iframe
            src={officeUrl}
            title={fileName}
            className="w-full"
            style={{ height: '60vh', minHeight: 400, border: 0 }}
          />
        ) : (
          <div className="p-6 text-center">
            <FileSpreadsheet className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-700 mb-1">{fileName}</p>
            <p className="text-xs text-gray-500 mb-3">
              La vista previa de Excel no está disponible en este entorno.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir archivo
            </a>
          </div>
        )}
      </div>
    );
  }

  // ==================== OTRO ====================
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition ${className}`}
    >
      <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{fileName}</p>
        <p className="text-xs text-gray-400">Clic para abrir</p>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-400" />
    </a>
  );
}
