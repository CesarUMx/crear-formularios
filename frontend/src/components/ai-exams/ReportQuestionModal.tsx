import { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import Modal from '../common/Modal';
import { useColors } from '../../hooks/useColors';
import { useToast } from '../common';

interface ReportQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionData: {
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  };
  examId: string;
  attemptId: string;
}

export default function ReportQuestionModal({
  isOpen,
  onClose,
  questionData,
  examId,
  attemptId,
}: ReportQuestionModalProps) {
  const colors = useColors();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Error', 'Por favor describe el motivo del reporte');
      return;
    }

    setSubmitting(true);
    try {
      const reportData = {
        examId,
        attemptId,
        questionId: questionData.questionId,
        questionText: questionData.questionText,
        userAnswer: questionData.userAnswer,
        correctAnswer: questionData.correctAnswer,
        reason: reason.trim(),
      };

      const response = await fetch('http://localhost:3000/api/question-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar el reporte');
      }

      toast.success('Reporte enviado', 'Tu reporte ha sido enviado al instructor');
      setReason('');
      onClose();
    } catch (error) {
      toast.error('Error', 'No se pudo enviar el reporte. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reportar Pregunta" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información de la pregunta */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                Pregunta a reportar:
              </h3>
              <p className="text-sm text-gray-700 mb-3">{questionData.questionText}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">Tu respuesta:</span>
                  <span className="text-gray-900">{questionData.userAnswer}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700">Respuesta marcada como correcta:</span>
                  <span className="text-gray-900">{questionData.correctAnswer}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivo del reporte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo del reporte *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none"
            placeholder="Explica por qué crees que tu respuesta debería ser correcta o por qué la pregunta tiene un error..."
            required
            disabled={submitting}
          />
          <p className="mt-2 text-xs text-gray-500">
            El instructor revisará tu reporte y podrá ajustar la calificación si procede.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            style={{ backgroundColor: colors.primaryColor }}
            className="flex-1 px-4 py-2.5 text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
