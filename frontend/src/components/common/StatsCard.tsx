import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
  valueSize?: 'sm' | 'md' | 'lg';
}

export default function StatsCard({
  icon: Icon,
  iconColor = 'text-blue-600',
  label,
  value,
  subtitle,
  valueColor = 'text-gray-900',
  valueSize = 'lg',
}: StatsCardProps) {
  const sizeClass = valueSize === 'lg' ? 'text-3xl' : valueSize === 'md' ? 'text-2xl' : 'text-xl';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <p className={`${sizeClass} font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
