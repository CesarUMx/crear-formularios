import { useState, useEffect } from 'react';
import { examService } from '../../lib/examService';
import { api } from '../../lib/api';
import { useToast, ToastContainer, DeleteDialog, useDialog } from '../common';
import { X, UserPlus, Trash2, Users, Mail, Key, Loader, AlertCircle, Copy, Check, Download, Calendar } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  scheduleId: string | null;
  schedule: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string | null;
  } | null;
  _count: {
    attempts: number;
  };
}

interface Schedule {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  capacity: number;
  availableSpots: number;
}

interface ManageStudentsModalProps {
  examId: string;
  examTitle: string;
  examSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageStudentsModal({
  examId,
  examTitle,
  examSlug,
  isOpen,
  onClose,
}: ManageStudentsModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [hasAnySchedule, setHasAnySchedule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const deleteDialog = useDialog();
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    scheduleId: '',
  });

  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadStudents();
      loadSchedules();
    }
  }, [isOpen, examId]);

  const loadSchedules = async () => {
    try {
      // Cargar todos para saber si el examen tiene horarios configurados
      const all = await api.get<Schedule[]>(`/exam-schedules/exam/${examId}`);
      setHasAnySchedule(all.length > 0);
      // Solo los disponibles (activos y con cupo) para el selector
      const available = await api.get<Schedule[]>(`/exam-schedules/exam/${examId}/available`);
      setSchedules(available);
    } catch {
      // No es crítico si no hay horarios
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await examService.getStudents(examId);
      setStudents(data);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newStudent.name.trim() || !newStudent.email.trim() || !newStudent.password.trim()) {
      toast.error('Error', 'Todos los campos son obligatorios');
      return;
    }

    try {
      setAdding(true);
      await examService.addStudents(examId, [newStudent]);
      toast.success('Estudiante agregado', `${newStudent.name} fue agregado correctamente`);
      setNewStudent({ name: '', email: '', password: '', scheduleId: '' });
      setShowAddForm(false);
      await loadStudents();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al agregar estudiante');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setStudentToDelete({ id: studentId, name: studentName });
    deleteDialog.open();
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      await examService.deleteStudent(examId, studentToDelete.id);
      toast.success('Estudiante eliminado', `${studentToDelete.name} fue eliminado correctamente`);
      await loadStudents();
      deleteDialog.close();
      setStudentToDelete(null);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al eliminar estudiante');
    }
  };

  const handleExportCSV = async (resetPasswords: boolean) => {
    try {
      setExporting(true);
      setShowExportOptions(false);
      await examService.exportStudentsCSV(examId, resetPasswords);
      toast.success('CSV descargado', resetPasswords ? 'Contraseñas reseteadas e incluidas en el archivo' : 'Archivo descargado correctamente');
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    const examUrl = `${window.location.origin}/e/${examSlug}`;
    try {
      await navigator.clipboard.writeText(examUrl);
      setCopiedLink(true);
      toast.success('Link copiado', 'El enlace del examen fue copiado al portapapeles');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Error', 'No se pudo copiar el enlace');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Estudiantes Autorizados</h2>
              <p className="text-sm text-gray-600">{examTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Examen Privado</p>
                <p>Solo los estudiantes en esta lista podran acceder al examen. Cada estudiante necesita su correo y contrasena para iniciar sesion.</p>
              </div>
            </div>
          </div>

          {/* Link del Examen */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Link del Examen
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`${window.location.origin}/e/${examSlug}`}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Comparte este link con tus estudiantes para que puedan acceder al examen
            </p>
          </div>

          {/* Boton/Formulario Agregar Estudiante */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-medium">Agregar Estudiante</span>
            </button>
          ) : (
            <form onSubmit={handleAddStudent} className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Nuevo Estudiante</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Juan Perez"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electronico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="juan@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={newStudent.password}
                      onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contrasena temporal"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    El estudiante usara esta contrasena para acceder al examen
                  </p>
                </div>

                {hasAnySchedule && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Horario
                    </label>
                    {schedules.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        No hay horarios disponibles. Todos están llenos o inactivos.
                      </div>
                    ) : (
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={newStudent.scheduleId}
                          onChange={(e) => setNewStudent({ ...newStudent, scheduleId: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="">Sin horario asignado</option>
                          {schedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title} — {new Date(s.startTime).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              {s.location ? ` · ${s.location}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {adding ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Agregar
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewStudent({ name: '', email: '', password: '', scheduleId: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Lista de Estudiantes */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay estudiantes autorizados</p>
              <p className="text-sm text-gray-400 mt-1">Agrega estudiantes para que puedan acceder al examen</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Estudiantes ({students.length})</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowExportOptions(v => !v)}
                    disabled={exporting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Exportar CSV
                  </button>
                  {showExportOptions && (
                    <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-700">¿Qué incluir en el CSV?</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportCSV(false)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition"
                      >
                        <p className="font-medium text-gray-900">Nombre y correo</p>
                        <p className="text-xs text-gray-500">Sin contraseñas</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCSV(true)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition border-t border-gray-100"
                      >
                        <p className="font-medium text-orange-700">Nombre, correo y contraseñas nuevas</p>
                        <p className="text-xs text-orange-600">Se generan y reemplazan las contraseñas actuales</p>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                    {student.schedule && (
                      <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {student.schedule.title} — {new Date(student.schedule.startTime).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {student.schedule.location ? ` · ${student.schedule.location}` : ''}
                      </p>
                    )}
                    {student._count.attempts > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        {student._count.attempts} intento(s) realizado(s)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteStudent(student.id, student.name)}
                    disabled={student._count.attempts > 0}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      student._count.attempts > 0
                        ? 'No se puede eliminar porque ya tiene intentos'
                        : 'Eliminar estudiante'
                    }
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Dialog de confirmacion para eliminar estudiante */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={confirmDeleteStudent}
        itemName={studentToDelete?.name || ''}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
