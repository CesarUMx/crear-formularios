import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonIcon?: LucideIcon;
  primaryColor?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon: ButtonIcon,
  primaryColor = '#006eff'
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border-2 border-dashed p-12" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex flex-col items-center justify-center text-center">
        <div 
          className="p-4 rounded-full mb-4"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <Icon 
            className="w-16 h-16" 
            style={{ color: `${primaryColor}80` }}
          />
        </div>
        <h3 className="text-xl font-semibold" style={{ color: '#0F172A' }}>{title}</h3>
        <p className="mb-6 max-w-md" style={{ color: '#334155' }}>{description}</p>
        {buttonText && onButtonClick && (
          <button
            onClick={onButtonClick}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {ButtonIcon && <ButtonIcon className="w-5 h-5" />}
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
