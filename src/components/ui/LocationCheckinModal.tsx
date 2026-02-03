import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, CheckCircle, XCircle, Navigation, AlertCircle } from 'lucide-react';

interface LocationCheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  targetLat: number | null;
  targetLng: number | null;
  radiusMeters: number;
  pointsAwarded: number;
  pointsCurrencyName: string;
  onSuccess: () => void;
  isLoading?: boolean;
}

type CheckinState = 'idle' | 'locating' | 'success' | 'too_far' | 'error';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function LocationCheckinModal({
  open,
  onOpenChange,
  activityName,
  targetLat,
  targetLng,
  radiusMeters,
  pointsAwarded,
  pointsCurrencyName,
  onSuccess,
  isLoading = false,
}: LocationCheckinModalProps) {
  const [checkinState, setCheckinState] = useState<CheckinState>('idle');
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setCheckinState('idle');
      setCurrentDistance(null);
      setErrorMessage('');
    }
  }, [open]);

  const handleCheckin = () => {
    if (!navigator.geolocation) {
      setCheckinState('error');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    // Check if we have target coordinates (for preview mode simulation)
    if (targetLat === null || targetLng === null) {
      // Simulate successful check-in for preview/demo
      setCheckinState('locating');
      setTimeout(() => {
        setCurrentDistance(50);
        setCheckinState('success');
      }, 1500);
      return;
    }

    setCheckinState('locating');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const distance = calculateDistance(latitude, longitude, targetLat, targetLng);
        
        setCurrentDistance(Math.round(distance));

        // Check if within radius (with some tolerance for GPS accuracy)
        const effectiveRadius = Math.max(radiusMeters, accuracy);
        
        if (distance <= effectiveRadius) {
          setCheckinState('success');
        } else {
          setCheckinState('too_far');
        }
      },
      (error) => {
        setCheckinState('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location access denied. Please enable location permissions in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location information is unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Please try again.');
            break;
          default:
            setErrorMessage('An unknown error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClaimPoints = () => {
    onSuccess();
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Check-in
          </DialogTitle>
          <DialogDescription>
            Verify your location to complete "{activityName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Idle State */}
          {checkinState === 'idle' && (
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Navigation className="h-12 w-12 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  We'll check if you're at the venue to verify your attendance.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You must be within {radiusMeters}m of the location.
                </p>
              </div>
              <Button onClick={handleCheckin} className="w-full gradient-stadium">
                <MapPin className="h-4 w-4 mr-2" />
                Check My Location
              </Button>
            </div>
          )}

          {/* Locating State */}
          {checkinState === 'locating' && (
            <div className="text-center space-y-4 py-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground">Finding your location...</p>
            </div>
          )}

          {/* Success State */}
          {checkinState === 'success' && (
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-success">You're Here!</h3>
                {currentDistance !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    You are {formatDistance(currentDistance)} from the venue
                  </p>
                )}
              </div>
              <Badge className="bg-primary/10 text-primary text-lg py-2 px-4">
                +{pointsAwarded} {pointsCurrencyName}
              </Badge>
              <Button 
                onClick={handleClaimPoints} 
                disabled={isLoading}
                className="w-full gradient-stadium"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Claim Points
              </Button>
            </div>
          )}

          {/* Too Far State */}
          {checkinState === 'too_far' && (
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
                <AlertCircle className="h-12 w-12 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-warning">Too Far Away</h3>
                {currentDistance !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    You are {formatDistance(currentDistance)} from the venue.
                    <br />
                    You need to be within {radiusMeters}m to check in.
                  </p>
                )}
              </div>
              <Button 
                onClick={handleCheckin} 
                variant="outline"
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Error State */}
          {checkinState === 'error' && (
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-destructive">Location Error</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
              <Button 
                onClick={handleCheckin} 
                variant="outline"
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
