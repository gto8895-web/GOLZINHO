import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
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
  ListFilter,
  Cloud,
  CloudOff,
  Copy,
  Check,
  Key,
  Loader2
} from 'lucide-react';
import { getDocFromServer, doc } from 'firebase/firestore';
import { 
  db, 
  generateSyncCode, 
  generateUserId, 
  saveUserData, 
  loadUserData, 
  findUserBySyncCode,
  findUserByPlate
} from './firebase';

export default function App() {
  // Cloud Sync state
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('golzinho_user_id') || '';
  });

  const [syncCode, setSyncCode] = useState<string>(() => {
    return localStorage.getItem('golzinho_sync_code') || '';
  });

  const [isIdentified, setIsIdentified] = useState<boolean>(() => {
    return !!localStorage.getItem('golzinho_user_id');
  });

  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // UI helper states for cloud sync
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Identity Portal State
  const [portalTab, setPortalTab] = useState<'login' | 'register'>('login');
  const [portalPlate, setPortalPlate] = useState('');
  const [portalSyncCode, setPortalSyncCode] = useState('');
  
  // Registration fields
  const [regPlate, setRegPlate] = useState('');
  const [regBrand, setRegBrand] = useState('Volkswagen');
  const [regName, setRegName] = useState('Gol G4');
  const [regYear, setRegYear] = useState('2008');
  const [regOdometer, setRegOdometer] = useState('120000');
  
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

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

  // 1. Initial Load of cloud data on mount / userId change
  useEffect(() => {
    if (!userId) {
      setCloudLoaded(false);
      return;
    }

    async function initCloudData() {
      try {
        setSyncStatus('syncing');
        // Test connection using an allowed document path to avoid security rules permission errors
        try {
          await getDocFromServer(doc(db, 'users', 'connection_test'));
        } catch (e: any) {
          if (e instanceof Error && (e.message.toLowerCase().includes('offline') || e.message.toLowerCase().includes('unavailable'))) {
            console.warn("Client offline on connection test.");
            setSyncStatus('offline');
          }
        }

        const cloudData = await loadUserData(userId);
        if (cloudData) {
          setVehicle(cloudData.vehicle);
          setFuelLogs(cloudData.fuelLogs);
          setMaintenanceLogs(cloudData.maintenanceLogs);
        } else {
          // If no cloud data exists yet, seed the cloud database with current local data
          await saveUserData(userId, syncCode, vehicle, fuelLogs, maintenanceLogs);
        }
        setSyncStatus('connected');
      } catch (err) {
        console.error("Erro ao inicializar dados com Firestore:", err);
        setSyncStatus('error');
      } finally {
        setCloudLoaded(true);
      }
    }
    initCloudData();
  }, [userId]);

  // 2. Auto-save local updates to the cloud (with debounce)
  useEffect(() => {
    if (!cloudLoaded || !userId) return;

    // Save to localStorage immediately as local cache
    localStorage.setItem('car_tracker_vehicle_v2', JSON.stringify(vehicle));
    localStorage.setItem('car_tracker_fuel_logs_v2', JSON.stringify(fuelLogs));
    localStorage.setItem('car_tracker_maint_logs_v2', JSON.stringify(maintenanceLogs));

    // Sync to cloud
    if (userId && syncCode) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      const delayDebounceFn = setTimeout(() => {
        saveUserData(userId, syncCode, vehicle, fuelLogs, maintenanceLogs)
          .then(() => {
            setSyncStatus('connected');
            setIsSyncing(false);
          })
          .catch((err) => {
            console.error("Erro ao sincronizar com Firestore:", err);
            setSyncStatus('error');
            setIsSyncing(false);
          });
      }, 1000);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [vehicle, fuelLogs, maintenanceLogs, userId, syncCode, cloudLoaded]);

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

  // Handle portal login (either by plate or sync code)
  const handlePortalLogin = async (e: FormEvent) => {
    e.preventDefault();
    setPortalError(null);
    const searchPlate = portalPlate.trim();
    const searchCode = portalSyncCode.trim();
    
    if (!searchPlate && !searchCode) {
      setPortalError('Por favor, informe a Placa do Veículo ou o Código de Sincronização.');
      return;
    }

    setPortalLoading(true);
    try {
      let cloudData = null;
      if (searchPlate) {
        cloudData = await findUserByPlate(searchPlate);
      } else if (searchCode) {
        cloudData = await findUserBySyncCode(searchCode);
      }

      if (cloudData) {
        // Active load of cloud data
        setUserId(cloudData.userId);
        setSyncCode(cloudData.syncCode);
        setVehicle(cloudData.vehicle);
        setFuelLogs(cloudData.fuelLogs);
        setMaintenanceLogs(cloudData.maintenanceLogs);

        localStorage.setItem('golzinho_user_id', cloudData.userId);
        localStorage.setItem('golzinho_sync_code', cloudData.syncCode);
        setIsIdentified(true);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        if (searchPlate) {
          setPortalError(`Nenhum veículo encontrado com a placa ${searchPlate.toUpperCase()}. Verifique a placa ou crie um novo cadastro.`);
        } else {
          setPortalError('Código de sincronização inválido ou inexistente.');
        }
      }
    } catch (err) {
      console.error("Erro ao autenticar no portal:", err);
      setPortalError('Ocorreu uma falha de conexão com a nuvem. Tente novamente.');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle portal vehicle registration
  const handlePortalRegister = async (e: FormEvent) => {
    e.preventDefault();
    setPortalError(null);

    const plateVal = regPlate.trim().toUpperCase();
    const brandVal = regBrand.trim();
    const nameVal = regName.trim();
    const yearVal = regYear.trim();
    const odomVal = parseInt(regOdometer.trim()) || 0;

    if (!plateVal) {
      setPortalError('A Placa do Veículo é obrigatória para salvar na nuvem.');
      return;
    }
    if (!brandVal || !nameVal) {
      setPortalError('Marca e Modelo são obrigatórios.');
      return;
    }

    const normalizedPlate = plateVal.replace(/[^A-Z0-9]/g, '');
    if (normalizedPlate.length < 3) {
      setPortalError('Por favor, informe uma placa de veículo válida.');
      return;
    }

    setPortalLoading(true);
    try {
      // Check for duplicates
      const existing = await findUserByPlate(normalizedPlate);
      if (existing) {
        setPortalError(`A placa ${plateVal} já está cadastrada! Volte na aba "Acessar" para entrar.`);
        setPortalLoading(false);
        return;
      }

      const generatedId = `placa_${normalizedPlate}`;
      const generatedCode = generateSyncCode();
      const newVehicle: Vehicle = {
        id: `vehicle-${Date.now()}`,
        name: nameVal,
        brand: brandVal,
        plate: plateVal,
        year: yearVal || undefined,
        currentOdometer: odomVal,
      };

      // Save initial state to cloud
      await saveUserData(generatedId, generatedCode, newVehicle, [], []);

      setUserId(generatedId);
      setSyncCode(generatedCode);
      setVehicle(newVehicle);
      setFuelLogs([]);
      setMaintenanceLogs([]);

      localStorage.setItem('golzinho_user_id', generatedId);
      localStorage.setItem('golzinho_sync_code', generatedCode);
      setIsIdentified(true);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao registrar veículo:", err);
      setPortalError('Erro ao salvar veículo na nuvem. Verifique sua conexão.');
    } finally {
      setPortalLoading(false);
    }
  };

  // Disconnect active session
  const handleLogout = () => {
    if (confirm('Deseja desconectar deste veículo? Seus dados continuam 100% seguros na nuvem e você poderá entrar novamente a qualquer momento digitando a placa.')) {
      localStorage.removeItem('golzinho_user_id');
      localStorage.removeItem('golzinho_sync_code');
      localStorage.removeItem('car_tracker_vehicle_v2');
      localStorage.removeItem('car_tracker_fuel_logs_v2');
      localStorage.removeItem('car_tracker_maint_logs_v2');
      
      setUserId('');
      setSyncCode('');
      setVehicle(INITIAL_VEHICLE);
      setFuelLogs([]);
      setMaintenanceLogs([]);
      setCloudLoaded(false);
      setIsIdentified(false);
    }
  };

  // Copy sync code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Connect / load existing database from cloud using sync code
  const handleConnectSyncCode = async () => {
    if (!inputSyncCode.trim()) {
      setSyncError('Por favor, informe um código de sincronização.');
      return;
    }
    
    setSyncStatus('syncing');
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const cloudData = await findUserBySyncCode(inputSyncCode);
      if (cloudData) {
        // Update local session
        setUserId(cloudData.userId);
        setSyncCode(cloudData.syncCode);
        setVehicle(cloudData.vehicle);
        setFuelLogs(cloudData.fuelLogs);
        setMaintenanceLogs(cloudData.maintenanceLogs);
        
        localStorage.setItem('golzinho_user_id', cloudData.userId);
        localStorage.setItem('golzinho_sync_code', cloudData.syncCode);
        
        setSyncSuccess(true);
        setInputSyncCode('');
        setSyncStatus('connected');
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        setSyncError('Código de sincronização não encontrado ou incorreto.');
        setSyncStatus('error');
      }
    } catch (err) {
      console.error("Erro ao conectar código de sincronização:", err);
      setSyncError('Falha ao conectar com o servidor da nuvem.');
      setSyncStatus('error');
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

  if (!isIdentified) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden" id="identity-portal-root">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/30 mb-4">
              <Car className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase">
              GOLZINHO <span className="text-emerald-500 font-black">NUVEM</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Sincronização 100% Automática</p>
            <p className="text-[11px] text-slate-500 mt-2 max-w-sm">
              Todos os seus dados de consumo, combustível e manutenção salvos permanentemente na nuvem. Nunca perca nada, mesmo ao limpar os dados do navegador.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => { setPortalTab('login'); setPortalError(null); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                portalTab === 'login' 
                  ? 'border-emerald-500 text-emerald-500 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              Acessar Veículo
            </button>
            <button
              onClick={() => { setPortalTab('register'); setPortalError(null); }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                portalTab === 'register' 
                  ? 'border-emerald-500 text-emerald-500 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              Novo Cadastro
            </button>
          </div>

          {/* Tab Content */}
          {portalTab === 'login' ? (
            <form onSubmit={handlePortalLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Acessar pela Placa do Veículo</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234 ou GOL-1994"
                    value={portalPlate}
                    onChange={(e) => setPortalPlate(e.target.value.toUpperCase())}
                    className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-widest text-center text-sm"
                    disabled={portalLoading}
                  />
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ou</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Código de Sincronização (Backup)</label>
                <input
                  type="text"
                  placeholder="Ex: GOL-123456"
                  value={portalSyncCode}
                  onChange={(e) => setPortalSyncCode(e.target.value.toUpperCase())}
                  className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-widest text-center text-sm"
                  disabled={portalLoading}
                />
              </div>

              {portalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs text-center font-medium leading-relaxed">
                  {portalError}
                </div>
              )}

              <button
                type="submit"
                disabled={portalLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Conectando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" /> Entrar no Painel do Veículo
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePortalRegister} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Placa do Veículo (Única)</label>
                <input
                  type="text"
                  placeholder="Ex: GOL-1994"
                  value={regPlate}
                  onChange={(e) => setRegPlate(e.target.value.toUpperCase())}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500 font-mono text-center tracking-wider text-sm"
                  required
                  disabled={portalLoading}
                />
                <p className="text-[9px] text-slate-500 mt-1">Essa placa será sua chave de acesso permanente na nuvem.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Marca</label>
                  <input
                    type="text"
                    value={regBrand}
                    onChange={(e) => setRegBrand(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs"
                    required
                    disabled={portalLoading}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Modelo</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs"
                    required
                    disabled={portalLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Ano</label>
                  <input
                    type="text"
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs"
                    placeholder="Ex: 2008"
                    disabled={portalLoading}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Odômetro Inicial</label>
                  <input
                    type="number"
                    value={regOdometer}
                    onChange={(e) => setRegOdometer(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs font-mono"
                    placeholder="Ex: 120000"
                    disabled={portalLoading}
                  />
                </div>
              </div>

              {portalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs text-center font-medium leading-relaxed">
                  {portalError}
                </div>
              )}

              <button
                type="submit"
                disabled={portalLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs uppercase tracking-wider"
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando na Nuvem...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" /> Criar Espaço na Nuvem
                  </>
                )}
              </button>
            </form>
          )}

          {/* Safe cloud storage disclaimer */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center gap-2 text-[10px] text-slate-500 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Conexão segura com Firebase Firestore ativa</span>
          </div>

        </div>
      </div>
    );
  }

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
            {/* Switch Vehicle Cloud Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 hover:text-emerald-350 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Sair ou trocar de veículo na nuvem"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Trocar Veículo
            </button>

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
        
        {/* Cloud Synchronization Panel */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5" id="cloud-sync-panel">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${
              syncStatus === 'syncing' ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/30' :
              syncStatus === 'offline' ? 'bg-amber-955/15 text-amber-500 border border-amber-900/30' :
              syncStatus === 'error' ? 'bg-rose-950/50 text-rose-400 border border-rose-900/30' :
              'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
            }`}>
              {syncStatus === 'syncing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
               syncStatus === 'offline' ? <CloudOff className="w-5 h-5" /> :
               syncStatus === 'error' ? <CloudOff className="w-5 h-5" /> :
               <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wide text-white flex items-center gap-1.5">
                  Sincronização em Nuvem <span className="text-emerald-400 text-[10px] font-normal">(100% Seguro)</span>
                </h3>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  syncStatus === 'syncing' ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/30 animate-pulse' :
                  syncStatus === 'offline' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' :
                  syncStatus === 'error' ? 'bg-rose-950/50 text-rose-400 border border-rose-900/30' :
                  'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                }`}>
                  {syncStatus === 'syncing' ? 'Sincronizando...' :
                   syncStatus === 'offline' ? 'Modo Offline' :
                   syncStatus === 'error' ? 'Erro na Nuvem' :
                   'Conectado'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xl leading-relaxed">
                Seus dados de abastecimento e manutenção estão 100% seguros na nuvem. Use o seu código exclusivo abaixo para recuperar seus dados ou acessar em outro aparelho caso limpe o navegador.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Sync Code display */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-2 px-3.5 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-widest text-slate-500 font-extrabold font-sans">Código da Nuvem</span>
                <span className="font-mono font-bold text-slate-100 text-xs tracking-widest">{syncCode}</span>
              </div>
              <button 
                onClick={handleCopyCode}
                className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Copiar código de sincronização"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Input to connect other code */}
            <div className="flex items-center gap-1.5">
              <input 
                type="text" 
                value={inputSyncCode}
                onChange={(e) => setInputSyncCode(e.target.value.toUpperCase())}
                placeholder="Digitar Código" 
                className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition w-full uppercase max-w-[130px]"
              />
              <button 
                onClick={handleConnectSyncCode}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Key className="w-3 h-3" /> Conectar
              </button>
            </div>

            {/* Disconnect/Switch vehicle button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-350 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Sair do veículo atual para conectar outro"
            >
              <RefreshCw className="w-3 h-3 text-slate-500 hover:text-white transition" />
              Trocar Veículo
            </button>
          </div>
        </div>

        {/* Sync Success / Error alerts */}
        {syncSuccess && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl flex items-start gap-3 text-emerald-400 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Dados Carregados da Nuvem!</p>
              <p className="text-slate-400 mt-0.5">Sua conta foi sincronizada com sucesso e todos os dados foram recuperados.</p>
            </div>
          </div>
        )}

        {syncError && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-900/40 rounded-xl flex items-start gap-3 text-rose-400 text-xs text-slate-350">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Falha na Sincronização</p>
              <p className="text-slate-400 mt-0.5">{syncError}</p>
            </div>
          </div>
        )}
        
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
