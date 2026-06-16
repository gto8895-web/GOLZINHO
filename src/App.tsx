import { useState, useEffect, ChangeEvent } from 'react';
import { Vehicle, FuelLog, MaintenanceLog } from './types';
import { INITIAL_VEHICLE, INITIAL_FUEL_LOGS, INITIAL_MAINTENANCE_LOGS } from './initialData';
import { enrichFuelLogsWithConsumption, calculateOverallStats, getMonthlySpendData } from './utils';
import { VehicleCard } from './components/VehicleCard';
import { FuelFormModal, MaintenanceFormModal, AvariaFormModal } from './components/Forms';
import { ChartsView } from './components/ChartsView';
import { LogsTable } from './components/LogsTable';
import { 
  Fuel, 
  Wrench, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle,
  Car,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

export default function App() {
  // Initialize state from local storage or initial seed data
  const [vehicle, setVehicle] = useState<Vehicle>(() => {
    const saved = localStorage.getItem('car_tracker_vehicle_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_VEHICLE;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('car_tracker_fuel_logs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_FUEL_LOGS;
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('car_tracker_maint_logs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_MAINTENANCE_LOGS;
  });

  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isAvariaModalOpen, setIsAvariaModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  // Sync to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem('car_tracker_vehicle_v2', JSON.stringify(vehicle));
  }, [vehicle]);

  useEffect(() => {
    localStorage.setItem('car_tracker_fuel_logs_v2', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('car_tracker_maint_logs_v2', JSON.stringify(maintenanceLogs));
  }, [maintenanceLogs]);

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicle(updatedVehicle);
  };

  const handleAddFuelLog = (logData: Omit<FuelLog, 'id' | 'vehicleId'>) => {
    const newLog: FuelLog = {
      ...logData,
      id: `fuel-${Date.now()}`,
      vehicleId: vehicle.id,
    };
    
    setFuelLogs((prev) => [newLog, ...prev]);

    // Automatically advance vehicle currentOdometer if this log has a higher reading
    if (newLog.odometer > vehicle.currentOdometer) {
      setVehicle((prev) => ({
        ...prev,
        currentOdometer: newLog.odometer,
      }));
    }
  };

  const handleAddMaintenanceLog = (
    logData: Omit<MaintenanceLog, 'id' | 'vehicleId'>,
    relatedAvariaId?: string
  ) => {
    const newLog: MaintenanceLog = {
      ...logData,
      id: `maint-${Date.now()}`,
      vehicleId: vehicle.id,
    };

    setMaintenanceLogs((prev) => {
      let updated = [newLog, ...prev];
      if (relatedAvariaId) {
        updated = updated.filter((item) => item.id !== relatedAvariaId);
      }
      return updated;
    });

    // Automatically advance vehicle currentOdometer if completed and odometer is higher
    if (newLog.status === 'Realizada' && newLog.odometer > vehicle.currentOdometer) {
      setVehicle((prev) => ({
        ...prev,
        currentOdometer: newLog.odometer,
      }));
    }
  };

  const handleDeleteFuelLog = (id: string) => {
    setFuelLogs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteMaintLog = (id: string) => {
    setMaintenanceLogs((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset demo data to defaults
  const handleResetToDefaults = () => {
    if (confirm('Deseja restaurar os dados de exemplo originais? Isso substituirá seus dados atuais.')) {
      setVehicle(INITIAL_VEHICLE);
      setFuelLogs(INITIAL_FUEL_LOGS);
      setMaintenanceLogs(INITIAL_MAINTENANCE_LOGS);
    }
  };

  // Clear all data to start fresh
  const handleClearAllData = () => {
    if (confirm('Tem certeza de que deseja apagar TODOS os seus dados? Isso não pode ser desfeito.')) {
      const freshVehicle: Vehicle = {
        id: 'vehicle-1',
        name: 'Meu Carro',
        brand: 'Marca',
        plate: '',
        year: '',
        currentOdometer: 0,
      };
      setVehicle(freshVehicle);
      setFuelLogs([]);
      setMaintenanceLogs([]);
    }
  };

  // Export database as JSON
  const handleExportData = () => {
    const packageData = {
      vehicle,
      fuelLogs,
      maintenanceLogs,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controle-carro-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import database from JSON backup file
  const handleImportData = (e: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.vehicle || !Array.isArray(parsed.fuelLogs) || !Array.isArray(parsed.maintenanceLogs)) {
            throw new Error('O arquivo selecionado não contém uma estrutura de backup válida.');
          }
          
          setVehicle(parsed.vehicle);
          setFuelLogs(parsed.fuelLogs);
          setMaintenanceLogs(parsed.maintenanceLogs);
          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 4000);
        } else {
          throw new Error('Formato inválido.');
        }
      } catch (err: any) {
        setImportError(err.message || 'Falha ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  // Computations
  const enrichedFuelLogs = enrichFuelLogsWithConsumption(fuelLogs);
  const overallStats = calculateOverallStats(vehicle.currentOdometer, fuelLogs, maintenanceLogs);
  const monthlySpendData = getMonthlySpendData(fuelLogs, maintenanceLogs);

  // Check for upcoming or overdue scheduled maintenance
  const scheduledServices = maintenanceLogs.filter((m) => m.status === 'Agendada');
  const alertService = scheduledServices.find((s) => {
    // Alert if remaining km or remaining date is close
    const kmMatches = s.odometer - vehicle.currentOdometer <= 1000 && s.odometer >= vehicle.currentOdometer;
    let dateMatches = false;
    if (s.date) {
      const daysLeft = (new Date(s.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      dateMatches = daysLeft <= 15 && daysLeft >= -5;
    }
    return kmMatches || dateMatches;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans leading-relaxed pb-16" id="app-root">
      
      {/* Top Banner (Header) */}
      <header className="bg-slate-900 border-b border-slate-850 py-3 shadow-md sticky top-0 z-40 navbar" id="main-header">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-widest uppercase">
                GOLZINHO
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">GESTÃO DE COMBUSTÍVEL, MANUTENÇÃO E CONSUMO</p>
            </div>
          </div>

          {/* Backup, Import and Defaults actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Backup Export */}
            <button
              onClick={handleExportData}
              className="px-3 py-1.5 border border-slate-800 rounded-lg font-semibold hover:bg-slate-800 transition text-slate-300 flex items-center gap-1.5 cursor-pointer"
              title="Exportar backup completo"
            >
              <Download className="w-3.5 h-3.5" /> Exportar
            </button>

            {/* Import Backup File */}
            <label className="px-3 py-1.5 border border-slate-800 rounded-lg font-semibold hover:bg-slate-800 transition text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Importar
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>

            <button
              onClick={handleResetToDefaults}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/40 transition flex items-center gap-1 cursor-pointer"
              title="Restaurar dados de exemplo"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Redefinir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 mt-5 space-y-5" id="main-content">
        
        {/* Import Notification Alerts */}
        {importError && (
          <div className="p-3.5 bg-red-950/40 border border-red-900/40 rounded-xl flex items-start gap-3 text-red-400 text-xs text-slate-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Erro de importação</p>
              <p className="text-slate-400 mt-0.5">{importError}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl flex items-start gap-3 text-emerald-400 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Backup importado com sucesso!</p>
              <p className="text-slate-400 mt-0.5">Os dados do seu veículo e o histórico de despesas foram atualizados.</p>
            </div>
          </div>
        )}

        {/* Maintenance Reminder Warning Notification */}
        {alertService && (
          <div className="p-3.5 bg-amber-955/15 border border-amber-900/50 rounded-xl flex items-start md:items-center justify-between gap-4 text-amber-200 text-xs shadow-md">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-amber-500 mt-0.5 md:mt-0" />
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-200">Manutenção Agendada Próxima!</p>
                <p className="text-slate-400 mt-1">
                  Lembrete: "{alertService.description}" programada para{' '}
                  <span className="font-bold text-white font-mono">{alertService.odometer.toLocaleString('pt-BR')} KM</span>{' '}
                  {alertService.date && <span>em {new Date(alertService.date).toLocaleDateString('pt-BR')}</span>}.
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="px-2 py-0.5 bg-amber-950 text-amber-400 font-bold rounded-md uppercase text-[9px] border border-amber-900/30">
                Atenção
              </span>
            </div>
          </div>
        )}

        {/* Top Grid: Car Card + Primary Action Triggers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="top-card-section">
          
          <VehicleCard vehicle={vehicle} onUpdateVehicle={handleUpdateVehicle} />

          {/* Quick Actions and Add operations */}
          <div className="bg-slate-900 rounded-xl border border-slate-850 p-5 shadow-lg md:col-span-2 flex flex-col justify-between space-y-4" id="action-triggers-card">
            <div>
              <h3 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">Painel de Lançamentos</h3>
              <p className="text-xs text-slate-500 mt-0.5">Registre de forma rápida novos registros para atualizar os dados gerais de consumo</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Register Fuel Button */}
              <button
                onClick={() => setIsFuelModalOpen(true)}
                className="p-4 bg-emerald-950/20 hover:bg-emerald-950/30 border border-emerald-900/30 hover:border-emerald-500/50 text-emerald-400 rounded-xl transition flex items-center justify-between group cursor-pointer"
                id="btn-trigger-fuel"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs uppercase tracking-wide">Novo Abastecimento</p>
                    <p className="text-[10px] text-emerald-600 font-bold">Controlar litros, posto e consumo</p>
                  </div>
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-550 group-hover:translate-x-1 transition" />
              </button>

              {/* Register Avaria Button */}
              <button
                onClick={() => setIsAvariaModalOpen(true)}
                className="p-4 bg-amber-950/20 hover:bg-amber-950/30 border border-amber-900/30 hover:border-amber-500/50 text-amber-400 rounded-xl transition flex items-center justify-between group cursor-pointer"
                id="btn-trigger-avaria"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-lg">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs uppercase tracking-wide">Avaria</p>
                    <p className="text-[10px] text-amber-600 font-bold">Problemas, falhas e consertos corretivos</p>
                  </div>
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-amber-550 group-hover:translate-x-1 transition" />
              </button>

              {/* Register Maintenance Button */}
              <button
                onClick={() => setIsMaintModalOpen(true)}
                className="p-4 bg-indigo-950/20 hover:bg-indigo-950/30 border border-indigo-900/30 hover:border-indigo-505/50 text-indigo-400 rounded-xl transition flex items-center justify-between group cursor-pointer"
                id="btn-trigger-maint"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs uppercase tracking-wide">Nova Manutenção</p>
                    <p className="text-[10px] text-indigo-600 font-bold">Peças, oficinas e preventivas</p>
                  </div>
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-indigo-550 group-hover:translate-x-1 transition" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-3 border-t border-slate-800 text-slate-500 font-bold">
              <span>* Use dados detalhados para obter o cálculo exato do km/L</span>
              <button onClick={handleClearAllData} className="text-red-500 hover:text-red-400 font-bold cursor-pointer transition uppercase tracking-wide">
                Apagar histórico completo
              </button>
            </div>
          </div>
        </div>

        {/* Global Statistics Indicators Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-indicators-grid">
          {/* Total spent Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-850 p-4 shadow-md flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-950 text-slate-400 rounded-lg">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Despesa Geral</p>
              <h4 className="text-base font-mono font-bold text-white mt-0.5">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overallStats.totalSpends)}
              </h4>
            </div>
          </div>

          {/* Fuel cost Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-850 p-4 shadow-md flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-950 text-emerald-400 rounded-lg">
              <Fuel className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Combustível</p>
              <h4 className="text-base font-mono font-bold text-white mt-0.5">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overallStats.totalFuelCost)}
              </h4>
            </div>
          </div>

          {/* Maintenance cost Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-850 p-4 shadow-md flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-950 text-indigo-400 rounded-lg">
              <Wrench className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Manutenção / Oficina</p>
              <h4 className="text-base font-mono font-bold text-white mt-0.5">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overallStats.totalMaintCost)}
              </h4>
            </div>
          </div>

          {/* Mean Cost / KM Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-850 p-4 shadow-md flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-950 text-teal-400 rounded-lg">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Custo Médio / KM</p>
              <h4 className="text-base font-mono font-bold text-teal-400 mt-0.5">
                {overallStats.costPerKm > 0 ? (
                  `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overallStats.costPerKm)}/km`
                ) : (
                  'R$ 0,00'
                )}
              </h4>
            </div>
          </div>
        </div>

        {/* Charts Presentation Component */}
        <ChartsView
          monthlyData={monthlySpendData}
          totalFuel={overallStats.totalFuelCost}
          totalMaintenance={overallStats.totalMaintCost}
        />

        {/* Unified timeline transactions Logs Component */}
        <LogsTable
          fuelLogs={enrichedFuelLogs}
          maintenanceLogs={maintenanceLogs}
          onDeleteFuelLog={handleDeleteFuelLog}
          onDeleteMaintLog={handleDeleteMaintLog}
        />

      </main>

      {/* Input Modals */}
      <FuelFormModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        onSubmit={handleAddFuelLog}
        currentOdometer={vehicle.currentOdometer}
      />

      <MaintenanceFormModal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        onSubmit={handleAddMaintenanceLog}
        currentOdometer={vehicle.currentOdometer}
        avarias={maintenanceLogs.filter((log) => log.type === 'Avaria')}
      />

      <AvariaFormModal
        isOpen={isAvariaModalOpen}
        onClose={() => setIsAvariaModalOpen(false)}
        onSubmit={handleAddMaintenanceLog}
        currentOdometer={vehicle.currentOdometer}
      />

    </div>
  );
}
