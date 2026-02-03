import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="bg-foreground py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          
          <p className="text-sm text-muted">
            The open football loyalty platform. Free forever.
          </p>

          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted hover:text-primary-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted hover:text-primary-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted hover:text-primary-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
