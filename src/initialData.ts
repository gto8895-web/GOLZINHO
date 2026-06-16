import { Vehicle, FuelLog, MaintenanceLog } from './types';

export const INITIAL_VEHICLE: Vehicle = {
  id: 'vehicle-1',
  name: 'Meu Veículo',
  brand: 'Cadastre a Marca',
  plate: '',
  year: '',
  currentOdometer: 0,
};

export const INITIAL_FUEL_LOGS: FuelLog[] = [];

export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [];

