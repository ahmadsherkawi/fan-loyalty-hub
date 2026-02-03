import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, Copy, Check, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  activityName: string;
  qrCodeData: string;
  pointsAwarded: number;
  pointsCurrency: string;
  clubName?: string;
}

export function QRCodeDisplay({
  isOpen,
  onClose,
  activityName,
  qrCodeData,
  pointsAwarded,
  pointsCurrency,
  clubName = 'ClubPass',
}: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData);
      setCopied(true);
      toast({ title: 'QR Code data copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Create a canvas to render the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 512;
    canvas.width = size;
    canvas.height = size + 120; // Extra space for text

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw QR code centered
      const qrSize = 400;
      const xOffset = (size - qrSize) / 2;
      ctx.drawImage(img, xOffset, 40, qrSize, qrSize);

      // Add activity name
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activityName, size / 2, qrSize + 80);

      // Add points badge
      ctx.font = '18px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(`+${pointsAwarded} ${pointsCurrency}`, size / 2, qrSize + 110);

      // Download
      const link = document.createElement('a');
      link.download = `${activityName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      URL.revokeObjectURL(url);
      toast({ title: 'QR Code downloaded!' });
    };
    img.src = url;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Pop-up blocked', description: 'Please allow pop-ups to print', variant: 'destructive' });
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activityName} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
              background: white;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code svg {
              width: 300px;
              height: 300px;
            }
            h1 {
              font-size: 28px;
              margin: 0 0 10px 0;
              color: #1a1a1a;
            }
            .points {
              font-size: 20px;
              color: #10b981;
              font-weight: 600;
              margin: 10px 0;
            }
            .club {
              font-size: 14px;
              color: #666;
              margin-top: 20px;
            }
            .instructions {
              font-size: 14px;
              color: #888;
              margin-top: 10px;
              max-width: 300px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${activityName}</h1>
            <p class="points">+${pointsAwarded} ${pointsCurrency}</p>
            <div class="qr-code">${svgData}</div>
            <p class="instructions">Scan this code with the ${clubName} app to earn points!</p>
            <p class="club">Powered by ${clubName}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code for Activity
          </DialogTitle>
          <DialogDescription>
            Display or print this QR code for fans to scan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Preview */}
          <Card className="bg-white">
            <CardContent className="py-6 flex flex-col items-center">
              <div ref={qrRef} className="bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={qrCodeData}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              </div>
              <h3 className="font-semibold text-foreground mt-4 text-center">
                {activityName}
              </h3>
              <Badge className="mt-2 bg-primary/10 text-primary hover:bg-primary/20">
                +{pointsAwarded} {pointsCurrency}
              </Badge>
            </CardContent>
          </Card>

          {/* QR Code Value */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="text-xs text-muted-foreground flex-1 truncate">
              {qrCodeData}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tip: Display this QR code on screens at your venue or print it for signage
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
