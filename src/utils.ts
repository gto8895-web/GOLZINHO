import { FuelLog, MaintenanceLog, FuelType } from './types';

/**
 * Calculates fuel consumption between consecutive logs sorted by odometer.
 * Formula: km_per_liter = (Odom_current - Odom_prev) / Liters_current
 */
export function enrichFuelLogsWithConsumption(logs: FuelLog[]): FuelLog[] {
  if (logs.length === 0) return [];
  
  // Sort logs by odometer ascending
  const sorted = [...logs].sort((a, b) => a.odometer - b.odometer);
  
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      sorted[i].consumptionKmL = undefined;
    } else {
      const distance = sorted[i].odometer - sorted[i - 1].odometer;
      if (distance > 0 && sorted[i].liters > 0) {
        sorted[i].consumptionKmL = Number((distance / sorted[i].liters).toFixed(2));
      } else {
        sorted[i].consumptionKmL = undefined;
      }
    }
  }
  
  // Return in original order or sorted by date descending (typically best for displaying in lists)
  return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Gets the consolidated average consumption (km/L) across all logs by fuel type
 */
export function calculateAverageConsumption(logs: FuelLog[]): { [key in FuelType]?: number } & { overall?: number } {
  const sorted = [...logs].sort((a, b) => a.odometer - b.odometer);
  if (sorted.length < 2) return {};

  const fuelStats: { [key in FuelType]?: { distance: number; liters: number } } = {};
  let totalDistance = 0;
  let totalLiters = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const distance = curr.odometer - prev.odometer;

    if (distance > 0 && curr.liters > 0) {
      totalDistance += distance;
      totalLiters += curr.liters;

      // Group by the current fill-up's fuel type
      const fType = curr.fuelType;
      if (!fuelStats[fType]) {
        fuelStats[fType] = { distance: 0, liters: 0 };
      }
      fuelStats[fType]!.distance += distance;
      fuelStats[fType]!.liters += curr.liters;
    }
  }

  const result: { [key in FuelType]?: number } & { overall?: number } = {};

  if (totalLiters > 0) {
    result.overall = Number((totalDistance / totalLiters).toFixed(2));
  }

  (Object.keys(fuelStats) as FuelType[]).forEach((type) => {
    const stat = fuelStats[type];
    if (stat && stat.liters > 0) {
      result[type] = Number((stat.distance / stat.liters).toFixed(2));
    }
  });

  return result;
}

/**
 * Aggregates monthly spendings for charts
 */
export interface MonthlySpend {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Abr/26"
  fuel: number;
  maintenance: number;
  total: number;
}

export function getMonthlySpendData(fuelLogs: FuelLog[], maintenanceLogs: MaintenanceLog[]): MonthlySpend[] {
  const dataMap: { [key: string]: { fuel: number; maintenance: number } } = {};

  const addSpend = (dateStr: string, amount: number, type: 'fuel' | 'maintenance') => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;

      if (!dataMap[key]) {
        dataMap[key] = { fuel: 0, maintenance: 0 };
      }
      dataMap[key][type] += amount;
    } catch (e) {
      // Ignore invalid date parsing
    }
  };

  fuelLogs.forEach(log => addSpend(log.date, log.totalPrice, 'fuel'));
  // Only include completed maintenance logs in historical spending
  maintenanceLogs
    .filter(log => log.status === 'Realizada')
    .forEach(log => addSpend(log.date, log.cost, 'maintenance'));

  // Convert map to sorted list
  const monthLabelsPT: { [key: string]: string } = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
  };

  const keys = Object.keys(dataMap).sort();
  
  // If no logs, return empty
  if (keys.length === 0) return [];

  return keys.map(key => {
    const [year, month] = key.split('-');
    const yearShort = year.substring(2);
    const monthLabel = `${monthLabelsPT[month] || month}/${yearShort}`;
    const fuel = Number(dataMap[key].fuel.toFixed(2));
    const maintenance = Number(dataMap[key].maintenance.toFixed(2));
    return {
      monthKey: key,
      monthLabel,
      fuel,
      maintenance,
      total: Number((fuel + maintenance).toFixed(2)),
    };
  });
}

/**
 * Calculates global statistics: total mileage, total costs, costs per km.
 */
export function calculateOverallStats(
  vehicleOdom: number,
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[]
) {
  const totalFuelCost = fuelLogs.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalMaintCost = maintenanceLogs
    .filter(m => m.status === 'Realizada')
    .reduce((sum, item) => sum + item.cost, 0);
    
  const totalSpends = totalFuelCost + totalMaintCost;

  // Total mileage driven since the first log
  let mileageDriven = 0;
  if (fuelLogs.length > 0 || maintenanceLogs.length > 0) {
    const odometers = [
      vehicleOdom,
      ...fuelLogs.map(f => f.odometer),
      ...maintenanceLogs.map(m => m.odometer)
    ].filter(o => o > 0);
    
    if (odometers.length > 0) {
      const maxOdom = Math.max(...odometers);
      const minOdom = Math.min(...odometers);
      mileageDriven = maxOdom - minOdom;
    }
  }

  const costPerKm = mileageDriven > 0 ? Number((totalSpends / mileageDriven).toFixed(2)) : 0;

  return {
    totalFuelCost,
    totalMaintCost,
    totalSpends,
    mileageDriven,
    costPerKm,
  };
}
