import { color } from 'chart.js/helpers';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonIcon?: LucideIcon;
  primaryColor?: string;
}

export default function PageHeader({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon: ButtonIcon,
  primaryColor = '#006eff'
}: PageHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Icon 
              className="w-8 h-8" 
              style={{ color: primaryColor }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{title}</h1>
            <p style={{ color: '#334155' }}>{description}</p>
          </div>
        </div>
        {buttonText && onButtonClick && (
          <button
            onClick={onButtonClick}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-all hover:opacity-90 shadow-sm"
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
