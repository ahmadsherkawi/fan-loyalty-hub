import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const containerClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const textClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('gradient-stadium rounded-xl shadow-stadium', containerClasses[size])}>
        <Trophy className={`${sizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={cn('font-display font-bold tracking-tight text-foreground', textClasses[size])}>
          ClubPass
        </span>
      )}
    </div>
  );
}
