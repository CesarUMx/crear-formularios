import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold, Italic, Underline, List, ListOrdered, Quote,
  Link2, Image as ImageIcon, Palette, X, Plus
} from 'lucide-react';

interface EmailRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertVar?: (insertFn: (text: string) => void) => void;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export default function EmailRichTextEditor({ value, onChange, placeholder, onInsertVar }: EmailRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true }),
      TextStyle,
      Color,
    ],
    content: value || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, []);

  // Expose insertText function to parent for variable chips
  useEffect(() => {
    if (!editor || !onInsertVar) return;
    onInsertVar((text: string) => {
      editor.chain().focus().insertContent(text).run();
    });
  }, [editor, onInsertVar]);

  if (!editor) {
    return <div className="text-center py-4 text-gray-500">Cargando editor...</div>;
  }

  const insertImage = () => {
    const url = prompt('URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertButton = () => {
    const text = prompt('Texto del botón:');
    if (!text) return;
    const url = prompt('URL del botón:');
    if (!url) return;

    // Insertar un link estilizado como botón con inline styles
    const html = `<a href="${url}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">${text}</a>`;
    editor.chain().focus().insertContent(html).run();
  };

  const insertLink = () => {
    const url = prompt('URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const setColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };

  return (
    <div className="space-y-2 border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-3 flex flex-wrap gap-1">
        {/* Texto */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded transition ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded transition ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded transition ${editor.isActive('strike') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Tachado"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="border-r border-gray-300"></div>

        {/* Títulos */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded transition text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Título H1"
        >
          H1
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded transition text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Título H2"
        >
          H2
        </button>

        <div className="border-r border-gray-300"></div>

        {/* Listas */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded transition ${editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Lista con viñetas"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded transition ${editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded transition ${editor.isActive('blockquote') ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'}`}
          title="Cita"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="border-r border-gray-300"></div>

        {/* Colores */}
        <div className="flex gap-1 border border-gray-300 rounded px-1 bg-white">
          {COLORS.map(color => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className="w-5 h-5 rounded border border-gray-300 hover:border-gray-600 transition"
              style={{ backgroundColor: color }}
              title={`Color: ${color}`}
            />
          ))}
        </div>

        <div className="border-r border-gray-300"></div>

        {/* Links e imágenes */}
        <button
          onClick={insertLink}
          className="p-2 rounded bg-white border border-gray-300 hover:bg-gray-100 transition"
          title="Insertar link"
        >
          <Link2 className="w-4 h-4" />
        </button>

        <button
          onClick={insertImage}
          className="p-2 rounded bg-white border border-gray-300 hover:bg-gray-100 transition"
          title="Insertar imagen"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          onClick={insertButton}
          className="p-2 rounded bg-white border border-gray-300 hover:bg-gray-100 transition"
          title="Insertar botón"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="border-r border-gray-300"></div>

        {/* Clear formatting */}
        <button
          onClick={() => editor.chain().focus().clearNodes().run()}
          className="p-2 rounded bg-white border border-gray-300 hover:bg-gray-100 transition"
          title="Limpiar formato"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Editor */}
      <div
        className="bg-white p-4 min-h-72 prose prose-sm max-w-none focus-within:outline-none cursor-text"
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent
          editor={editor}
          className="focus:outline-none"
        />
      </div>

      {/* Hint */}
      <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-xs text-blue-700">
        💡 El contenido se convierte automáticamente a HTML. Usa las variables de arriba para personalizar.
      </div>
    </div>
  );
}
