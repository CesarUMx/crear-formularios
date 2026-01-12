import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import ExamFilesManager from './ExamFilesManager';

interface ExamFilesManagerLoaderProps {
  examId: string;
}

export default function ExamFilesManagerLoader({ examId }: ExamFilesManagerLoaderProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFiles();
  }, [examId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const exam = await examService.getExamById(examId);
      setFiles(exam.supportFiles || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando archivos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <h3 className="font-semibold text-red-800">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <ExamFilesManager 
      examId={examId} 
      files={files} 
      onFilesChange={loadFiles} 
    />
  );
}
