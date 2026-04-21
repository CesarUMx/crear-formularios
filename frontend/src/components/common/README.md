# Componentes Comunes

Componentes UI reutilizables para toda la aplicación.

## 🎉 Toast (Notificaciones)

Notificaciones temporales que aparecen en la esquina superior derecha.

### Uso Básico

```tsx
import { useToast, ToastContainer } from '@/components/common';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('¡Éxito!', 'La operación se completó correctamente');
  };

  const handleError = () => {
    toast.error('Error', 'Algo salió mal');
  };

  return (
    <>
      <button onClick={handleSuccess}>Mostrar éxito</button>
      <button onClick={handleError}>Mostrar error</button>
      
      {/* Agregar el contenedor de toasts */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </>
  );
}
```

### API del useToast

```tsx
const toast = useToast();

// Métodos disponibles
toast.success(title, message?, duration?);
toast.error(title, message?, duration?);
toast.warning(title, message?, duration?);
toast.info(title, message?, duration?);
toast.removeToast(id);

// Propiedades
toast.toasts // Array de toasts activos
```

### Tipos de Toast

- **success** - Verde, para operaciones exitosas
- **error** - Rojo, para errores
- **warning** - Amarillo, para advertencias
- **info** - Azul, para información general

### Duración

Por defecto, los toasts desaparecen después de 5 segundos. Puedes personalizar la duración:

```tsx
toast.success('Guardado', 'Cambios guardados', 3000); // 3 segundos
toast.info('Información', 'Esto es importante', 0); // No se cierra automáticamente
```

---

## 💬 Dialog (Diálogos de Confirmación)

Diálogos modales para confirmaciones y acciones que requieren verificación.

### Uso Básico

```tsx
import { Dialog, useDialog } from '@/components/common';

function MyComponent() {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteItem();
      dialog.close();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={dialog.open}>Eliminar</button>
      
      <Dialog
        isOpen={dialog.isOpen}
        onClose={dialog.close}
        onConfirm={handleDelete}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que deseas eliminar este elemento?"
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={loading}
      />
    </>
  );
}
```

### DeleteDialog (Especializado)

Componente pre-configurado para confirmaciones de eliminación:

```tsx
import { DeleteDialog, useDialog } from '@/components/common';

function MyComponent() {
  const deleteDialog = useDialog();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await deleteItem();
    setLoading(false);
    deleteDialog.close();
  };

  return (
    <>
      <button onClick={deleteDialog.open}>Eliminar</button>
      
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDelete}
        itemName="Examen de Matemáticas"
        loading={loading}
      />
    </>
  );
}
```

### Tipos de Dialog

- **danger** - Rojo, para acciones destructivas (eliminar, desactivar)
- **warning** - Amarillo, para advertencias importantes
- **info** - Azul, para confirmaciones generales
- **success** - Verde, para confirmaciones positivas

### Props del Dialog

```tsx
interface DialogProps {
  isOpen: boolean;           // Si el diálogo está abierto
  onClose: () => void;       // Función al cerrar
  onConfirm: () => void;     // Función al confirmar
  title: string;             // Título del diálogo
  message: string;           // Mensaje descriptivo
  type?: DialogType;         // Tipo visual (danger, warning, info, success)
  confirmText?: string;      // Texto del botón confirmar (default: "Confirmar")
  cancelText?: string;       // Texto del botón cancelar (default: "Cancelar")
  confirmDisabled?: boolean; // Deshabilitar botón confirmar
  loading?: boolean;         // Mostrar spinner en botón confirmar
}
```

### Características

- ✅ Cierre con tecla `Escape`
- ✅ Cierre al hacer click fuera (backdrop)
- ✅ Bloqueo de scroll del body
- ✅ Animaciones suaves (fade-in, scale-in)
- ✅ Accesibilidad (ARIA labels, focus management)
- ✅ Estado de loading integrado
- ✅ Deshabilitar cierre durante loading

---

## 🎨 Ejemplo Completo

```tsx
import { useToast, ToastContainer, DeleteDialog, useDialog } from '@/components/common';

function ExamList() {
  const toast = useToast();
  const deleteDialog = useDialog();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteClick = (examId: string, examName: string) => {
    setSelectedExam({ id: examId, name: examName });
    deleteDialog.open();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;
    
    setLoading(true);
    try {
      await fetch(`/api/ai-exams/${selectedExam.id}`, { method: 'DELETE' });
      toast.success('Eliminado', `${selectedExam.name} fue eliminado correctamente`);
      deleteDialog.close();
      // Recargar lista...
    } catch (error) {
      toast.error('Error', 'No se pudo eliminar el examen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div>
        {exams.map(exam => (
          <div key={exam.id}>
            <h3>{exam.title}</h3>
            <button onClick={() => handleDeleteClick(exam.id, exam.title)}>
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {/* Diálogo de confirmación */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDeleteConfirm}
        itemName={selectedExam?.name || ''}
        loading={loading}
      />

      {/* Contenedor de toasts */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </>
  );
}
```

---

## 📝 Notas

- Los toasts se apilan verticalmente en la esquina superior derecha
- Los diálogos bloquean la interacción con el resto de la página
- Ambos componentes son completamente accesibles (ARIA)
- Los estilos usan TailwindCSS
- Los iconos son de `lucide-react`
