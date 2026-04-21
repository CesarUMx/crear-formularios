import { useState, useRef, useEffect } from 'react';
import { Camera, X, Check } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel: () => void;
}

export default function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso para continuar.');
      console.error('Error accessing camera:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoDataUrl);
      }
    }
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            📸 Verificación de Identidad
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Para exámenes privados, necesitamos verificar tu identidad. Por favor, toma una foto clara de tu rostro.
        </p>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={startCamera}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 justify-center">
              {!capturedPhoto ? (
                <button
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Camera className="w-5 h-5" />
                  Tomar Foto
                </button>
              ) : (
                <>
                  <button
                    onClick={retakePhoto}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Camera className="w-5 h-5" />
                    Tomar Otra
                  </button>
                  <button
                    onClick={confirmPhoto}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Check className="w-5 h-5" />
                    Confirmar y Continuar
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
