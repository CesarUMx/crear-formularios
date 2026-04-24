import { useRef, useEffect, useCallback, useState } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Mini editor de texto enriquecido con Bold, Italic y Underline.
 * Almacena y expone HTML (e.g. <strong>texto</strong>).
 * No depende de librerías externas.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  rows = 2,
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

  // Sincronizar valor externo → DOM solo cuando el foco no está en el editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  const applyFormat = useCallback((command: 'bold' | 'italic' | 'underline') => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    updateActiveFormats();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, updateActiveFormats]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      updateActiveFormats();
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, updateActiveFormats]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter → salto de línea simple
      e.preventDefault();
      document.execCommand('insertLineBreak', false);
      handleInput();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter normal → evitar que se cree un <div> en algunos navegadores
      e.preventDefault();
      document.execCommand('insertParagraph', false);
      handleInput();
    }
    // Atajos de teclado
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyFormat('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyFormat('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); applyFormat('underline'); }
  }, [applyFormat, handleInput]);

  const minHeight = `${rows * 2}rem`;

  const btnBase =
    'w-7 h-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 transition text-xs font-semibold select-none cursor-pointer';
  const btnActive = 'bg-blue-100 text-blue-700 hover:bg-blue-200';

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white ${className}`}>
      {/* Barra de herramientas */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('bold'); }}
          className={`${btnBase} ${activeFormats.bold ? btnActive : ''}`}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('italic'); }}
          className={`${btnBase} ${activeFormats.italic ? btnActive : ''}`}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyFormat('underline'); }}
          className={`${btnBase} ${activeFormats.underline ? btnActive : ''}`}
          title="Subrayado (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Área editable */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onSelect={updateActiveFormats}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="px-3 py-2 text-sm text-gray-900 outline-none overflow-y-auto"
      />
    </div>
  );
}
