import { Eye, X } from 'lucide-react';
import { Button } from './button';
import { useNavigate } from 'react-router-dom';

interface PreviewBannerProps {
  role: 'fan' | 'club_admin';
}

export function PreviewBanner({ role }: PreviewBannerProps) {
  const navigate = useNavigate();
  
  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="container py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-warning">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Preview Mode: Viewing as {role === 'club_admin' ? 'Club Admin' : 'Fan'}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-warning hover:text-warning hover:bg-warning/10"
          onClick={() => navigate('/preview')}
        >
          <X className="h-4 w-4 mr-1" />
          Exit Preview
        </Button>
      </div>
    </div>
  );
}
