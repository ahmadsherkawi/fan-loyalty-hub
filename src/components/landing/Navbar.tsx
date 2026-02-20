import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Compass, Shield, Sparkles } from 'lucide-react';

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <button 
          onClick={() => navigate('/')} 
          className="hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <Logo />
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                onClick={handleDashboard}
                className="gap-2 rounded-full"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="gap-2 rounded-full"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/explore')}
                className="gap-2 rounded-full"
              >
                <Compass className="h-4 w-4" />
                <span className="hidden sm:inline">Explore</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="rounded-full"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/auth?role=club_admin')}
                className="gradient-stadium rounded-full shadow-stadium font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Register Club
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/admin')}
                className="rounded-full text-muted-foreground hover:text-foreground"
                title="Admin Panel"
              >
                <Shield className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
