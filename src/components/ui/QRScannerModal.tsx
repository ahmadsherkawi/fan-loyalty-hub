import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, QrCode, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  expectedQRData: string | null;
  pointsAwarded: number;
  pointsCurrencyName: string;
  onSuccess: () => Promise<void>;
  isLoading?: boolean;
}

type ScanState = 'scanning' | 'success' | 'error';

export function QRScannerModal({
  open,
  onOpenChange,
  activityName,
  expectedQRData,
  pointsAwarded,
  pointsCurrencyName,
  onSuccess,
  isLoading = false,
}: QRScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const mountId = 'qr-reader';
  const wasOpenRef = useRef(false);

  useEffect(() => {
    // Reset state when modal closes (using a ref to track previous state)
    if (!open && wasOpenRef.current) {
      // Use setTimeout to defer state update
      const resetTimer = setTimeout(() => {
        setScanState('scanning');
        setErrorMessage('');
      }, 0);
      wasOpenRef.current = false;
      return () => clearTimeout(resetTimer);
    }
    wasOpenRef.current = open;

    if (!open) return;

    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        mountId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText: string) => {
          // QR code detected - validate it
          if (expectedQRData && decodedText === expectedQRData) {
            setScanState('success');
            // Stop scanning
            scanner.clear().catch(() => {});
          } else {
            setScanState('error');
            setErrorMessage('This QR code doesn\'t match the activity. Please scan the correct code.');
            // Continue scanning after delay
            setTimeout(() => {
              setScanState('scanning');
              setErrorMessage('');
            }, 2000);
          }
        },
        (err: unknown) => {
          // Ignore scan errors - they happen frequently when no QR is in frame
          console.debug('QR scan error', err);
        }
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, expectedQRData]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    onOpenChange(false);
  };

  const handleClaimPoints = async () => {
    await onSuccess();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Scan the QR code for "{activityName}" to earn {pointsAwarded} {pointsCurrencyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {scanState === 'scanning' && (
            <>
              <div 
                id={mountId} 
                className="w-full rounded-lg overflow-hidden [&_video]:rounded-lg"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Camera className="h-4 w-4" />
                <span>Point your camera at the QR code</span>
              </div>
            </>
          )}

          {scanState === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {scanState === 'success' && (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold text-lg mb-2">QR Code Verified!</h3>
              <p className="text-muted-foreground mb-4">
                You're about to earn {pointsAwarded} {pointsCurrencyName}
              </p>
              <Button 
                onClick={handleClaimPoints} 
                disabled={isLoading}
                className="w-full gradient-stadium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Claiming Points...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Claim {pointsAwarded} {pointsCurrencyName}
                  </>
                )}
              </Button>
            </div>
          )}

          {scanState === 'scanning' && (
            <Button variant="outline" onClick={handleClose} className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
