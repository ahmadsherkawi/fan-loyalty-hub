import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="bg-foreground/95 py-14 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-10" />
      
      <div className="container relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          
          <p className="text-sm text-muted/60 font-medium">
            The open football loyalty platform. Free forever.
          </p>

          <div className="flex items-center gap-8">
            {['Privacy', 'Terms', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm text-muted/50 hover:text-white transition-colors duration-300"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
