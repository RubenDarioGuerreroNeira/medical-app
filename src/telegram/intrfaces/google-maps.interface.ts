// google-maps.interfaces.ts

export interface GoogleMapsConfig {
  apiKey: string;
  maxRetries: number;
  timeout: number;
  radius: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface PharmacyResponse {
  name: string;
  location: Location;
  address: string;
  isOpen?: boolean;
  rating?: number;
}

export interface GoogleMapsApiResponse {
  status: string;
  results: GoogleMapsResult[];
  error_message?: string;
}

export interface GoogleMapsResult {
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity?: string;
  opening_hours?: {
    open_now: boolean;
  };
  rating?: number;
}
