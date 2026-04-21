import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import ExamEditor from './ExamEditor';
import type { Exam, ExamAccessType } from '../../lib/types';

interface ExamEditorLoaderProps {
  examId: string;
}

export default function ExamEditorLoader({ examId }: ExamEditorLoaderProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const data = await examService.getExamById(examId);
      setExam(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar examen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando examen...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="font-semibold text-red-800">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error || 'Examen no encontrado'}</p>
      </div>
    );
  }

  return (
    <ExamEditor
      examId={examId}
      initialData={{
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        timeLimit: exam.timeLimit,
        maxAttempts: exam.maxAttempts,
        passingScore: exam.passingScore,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
        showResults: exam.showResults,
        accessType: (exam.accessType as ExamAccessType) || 'PUBLIC',
        questionsPerAttempt: exam.questionsPerAttempt,
        sections: (exam.sections || []).map((section: any) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          fileUrl: section.fileUrl,
          fileName: section.fileName,
          fileType: section.fileType,
          questions: (section.questions || []).map((question: any) => ({
            id: question.id,
            type: question.type,
            text: question.text,
            helpText: question.helpText,
            points: question.points,
            options: question.options?.map((opt: any) => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            })),
            correctAnswer: question.correctAnswer || undefined,
            metadata: question.metadata || undefined,
            feedback: question.feedback || undefined,
            fileUrl: question.fileUrl,
            fileName: question.fileName,
            fileType: question.fileType,
          }))
        }))
      }}
    />
  );
}
