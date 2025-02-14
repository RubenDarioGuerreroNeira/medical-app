// import { OSMStatus } from "../farmacias-maps.service";

// export interface Location {
//   lat: number;
//   lng: number;
// }

// export interface PharmacyResponse {
//   name: string;
//   location: Location;
//   address: string;
//   isOpen: boolean | null;
//   rating: number | null;
// }

// // Nuevas interfaces para la respuesta de Nominatim
// export interface NominatimAddress {
//   road?: string;
//   house_number?: string;
//   suburb?: string;
//   city?: string;
//   state?: string;
//   country?: string;
//   postcode?: string;
//   [key: string]: string | undefined; // Para otras propiedades que pueda tener
// }

// export interface NominatimResponse {
//   place_id: number;
//   licence: string;
//   osm_type: string;
//   osm_id: number;
//   lat: string;
//   lon: string;
//   display_name: string;
//   address: NominatimAddress;
//   boundingbox: string[];
// }

// export interface OSMPlace {
//   lat: string;
//   lon: string;
//   display_name: string;
//   address: NominatimAddress;
// }

// export interface OSMResponse {
//   type: string;
//   features: OSMPlace[];
// }

export enum OSMStatus {
  OK = "OK",
  ZERO_RESULTS = "ZERO_RESULTS",
  REQUEST_DENIED = "REQUEST_DENIED",
  INVALID_REQUEST = "INVALID_REQUEST",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface OSMPlace {
  place_id: string;
  licence: string;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface Location {
  lat: number;
  lng: number;
}

export interface NominatimResponse {
  place_id: number;
  licence: string;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface PharmacyResponse {
  name: string;
  location: Location;
  address: string;
  isOpen: boolean;
  horario?: string;
  horario24h?: boolean;
  rating: number | null;
}

export interface Farmacia {
  id?: string;
  nombre?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
  servicio24h?: boolean;
  servicios?: string[];
  horario: string;
}
