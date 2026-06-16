export type FuelType = 'Gasolina' | 'Etanol' | 'Diesel' | 'GNV';
export type MaintenanceType = 'Óleo' | 'Filtro' | 'Pneus' | 'Freios' | 'Suspensão' | 'Elétrica' | 'Motor' | 'Avaria' | 'Outro';

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  plate?: string;
  year?: string;
  currentOdometer: number;
  renavam?: string;
  chassi?: string;
  motorNumber?: string;
  power?: string;
  displacement?: string;
  color?: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  pricePerLiter: number;
  liters: number;
  totalPrice: number;
  fuelType: FuelType;
  gasStation?: string;
  consumptionKmL?: number; // Calculated dynamically
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  type: MaintenanceType;
  odometer: number;
  cost: number;
  workshop?: string;
  nextOdometerLimit?: number; // Optional recommendation for next service
  nextDateLimit?: string;
  status: 'Realizada' | 'Agendada';
}
