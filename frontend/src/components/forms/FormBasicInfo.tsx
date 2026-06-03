import { useState } from 'react';
import { formService } from '../../lib/formService';
import type { FormType } from '../../lib/types';
import { PageHeader } from '../common';
import { useColors } from '../../hooks/useColors';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle, FileText, ClipboardList, BookOpen } from 'lucide-react';

const FORM_TYPES: {
    value: FormType;
    label: string;
    description: string;
    icon: LucideIcon;
    activeClass: string;
}[] = [
        {
            value: 'STANDARD',
            label: 'Estándar',
            description: 'Encuestas y datos',
            icon: ClipboardList,
            activeClass: 'border-blue-500 bg-blue-50 text-blue-700'
        },
        {
            value: 'EXAM_REGISTRATION',
            label: 'Examen',
            description: 'Registro + horarios',
            icon: BookOpen,
            activeClass: 'border-purple-500 bg-purple-50 text-purple-700'
        }
    ];

const iconSizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
} as const;

type IconSize = keyof typeof iconSizeMap;

interface FormBasicInfoProps {
    iconSize?: IconSize;
}

export default function FormBasicInfo({ iconSize = 'md' }: FormBasicInfoProps) {
    const colors = useColors();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [formType, setFormType] = useState<FormType>('STANDARD');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const { form: newForm } = await formService.createForm({
                title,
                description,
                templateId: 'modern',
                formType,
                sections: [
                    {
                        title: 'Sección 1',
                        description: '',
                        questions: [
                            {
                                type: 'TEXT',
                                text: '',
                                placeholder: '',
                                helpText: '',
                                isRequired: false,
                                options: []
                            }
                        ]
                    }
                ]
            });

            setSuccess('Formulario creado. Redirigiendo...');
            setTimeout(() => {
                window.location.href = `/admin/forms/${newForm.id}`;
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear formulario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FileText}
                title="Crear Nuevo Formulario"
                description="Elige el tipo de formulario que deseas crear"
                primaryColor={colors.primaryColor}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="rounded-lg bg-red-50 p-4 flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">{error}</div>
                    </div>
                )}

                {success && (
                    <div className="rounded-lg bg-green-50 p-4 flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-700">{success}</div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Información básica */}
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Información del Formulario</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre del Formulario *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: Encuesta de Satisfacción"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descripción (Opcional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe el propósito de este formulario..."
                            />
                        </div>
                    </div>

                    {/* Tipo de formulario */}
                    <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full">
                        <h3 className="text-lg font-semibold text-gray-900">Tipo de Formulario</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch flex-1 mt-4">
                            {FORM_TYPES.map(({ value, label, description, icon: Icon, activeClass }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFormType(value)}
                                    className={`flex flex-col items-center p-4 rounded-lg border-2 transition min-h-[120px] h-full w-full ${
                                        formType === value
                                            ? activeClass
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                    }`}
                                >
                                    <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
                                        <Icon className="w-full h-full max-w-[3.5rem] max-h-[3.5rem]" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-base">{label}</div>
                                        <div className="text-sm text-gray-500">{description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-between pt-4">
                    <a
                        href="/admin"
                        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                        Cancelar
                    </a>
                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        style={{ backgroundColor: colors.primaryColor }}
                        className="px-8 py-2.5 text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creando...' : 'Crear Formulario'}
                    </button>
                </div>
            </form>
        </div>
    );
}
