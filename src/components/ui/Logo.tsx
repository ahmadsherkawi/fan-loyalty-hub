import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="gradient-stadium rounded-lg p-2">
        <Trophy className={`${sizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`font-display font-bold text-foreground ${textClasses[size]}`}>
          ClubPass
        </span>
      )}
    </div>
  );
}
