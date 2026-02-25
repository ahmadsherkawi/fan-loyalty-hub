import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, LayoutDashboard, Compass, Shield, Bot } from 'lucide-react';

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

        {/* Center navigation for non-authenticated users */}
        {!user && (
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => navigate('/explore')}
              className="gap-2 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Compass className="h-4 w-4" />
              Explore Clubs
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/auth?role=fan')}
              className="gap-2 rounded-full text-muted-foreground hover:text-foreground"
            >
              <Bot className="h-4 w-4" />
              AI Analysis
            </Button>
          </div>
        )}

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
                onClick={() => navigate('/auth')}
                className="rounded-full"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth?role=fan')}
                className="gradient-stadium rounded-full shadow-stadium font-semibold text-white"
              >
                Get Started
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
