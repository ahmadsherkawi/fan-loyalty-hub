import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleDashboard = () => {
    if (profile?.role === 'club_admin') {
      navigate('/club/dashboard');
    } else {
      navigate('/fan/home');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
          <Logo />
        </button>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button
                variant="ghost"
                onClick={handleDashboard}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/explore')}
              >
                Explore Clubs
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button
                className="gradient-stadium"
                onClick={() => navigate('/auth?role=club_admin')}
              >
                Register Club
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
