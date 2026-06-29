import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
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
  Loader2,
  Plus,
  Trash2,
  X
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

  // Ref to track the last saved state to prevent redundant writes or initial overwrites
  const lastSavedRef = useRef<string>('');

  // Multi-vehicle Fleet states
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('car_tracker_vehicles_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    const oldSaved = localStorage.getItem('car_tracker_vehicle_v2');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        if (parsed && typeof parsed === 'object') return [parsed];
      } catch (e) { /* ignore */ }
    }
    return [INITIAL_VEHICLE];
  });

  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    const savedId = localStorage.getItem('car_tracker_active_vehicle_id');
    if (savedId) return savedId;
    
    const savedVehicles = localStorage.getItem('car_tracker_vehicles_v2');
    if (savedVehicles) {
      try {
        const parsed = JSON.parse(savedVehicles);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    const oldSaved = localStorage.getItem('car_tracker_vehicle_v2');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        if (parsed && parsed.id) return parsed.id;
      } catch (e) {}
    }
    return INITIAL_VEHICLE.id || 'vehicle-1';
  });

  // Derived current active vehicle
  const vehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || INITIAL_VEHICLE;

  // Custom setVehicle wrapper that acts as a backward-compatible adapter updating the active vehicle in the fleet array
  const setVehicle = (val: Vehicle | ((prev: Vehicle) => Vehicle)) => {
    setVehicles((prevVehicles) => {
      return prevVehicles.map((v) => {
        if (v.id === activeVehicleId) {
          const updated = typeof val === 'function' ? val(v) : val;
          return updated;
        }
        return v;
      });
    });
  };

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('car_tracker_fuel_logs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() => {
    const saved = localStorage.getItem('car_tracker_maint_logs_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // Keep the local storage cache updated synchronously in real-time as an instant failsafe, tracking modification timestamps
  useEffect(() => {
    localStorage.setItem('car_tracker_vehicles_v2', JSON.stringify(vehicles));
    localStorage.setItem('car_tracker_active_vehicle_id', activeVehicleId);
    localStorage.setItem('car_tracker_vehicle_v2', JSON.stringify(vehicle));
    localStorage.setItem('car_tracker_fuel_logs_v2', JSON.stringify(fuelLogs));
    localStorage.setItem('car_tracker_maint_logs_v2', JSON.stringify(maintenanceLogs));
    localStorage.setItem('car_tracker_updated_at', new Date().toISOString());
  }, [vehicles, activeVehicleId, vehicle, fuelLogs, maintenanceLogs]);

  // Add Vehicle Modal form states
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [addVehBrand, setAddVehBrand] = useState('Volkswagen');
  const [addVehName, setAddVehName] = useState('');
  const [addVehPlate, setAddVehPlate] = useState('');
  const [addVehYear, setAddVehYear] = useState('');
  const [addVehOdometer, setAddVehOdometer] = useState('');
  const [addVehError, setAddVehError] = useState<string | null>(null);

  // Toggle for legacy plate login in simplified portal
  const [showPlateLogin, setShowPlateLogin] = useState(false);

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

    // CRITICAL RACE-CONDITION GUARD: If cloudLoaded is already true (meaning registration
    // or login flow has just set up the fresh/loaded states), skip executing initCloudData
    // in the background to prevent stale cloud fetch from overwriting user modifications.
    if (cloudLoaded) {
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
          // Compare local vs cloud timestamps to resolve sync conflicts beautifully
          const cloudUpdatedAt = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;
          const localUpdatedAtStr = localStorage.getItem('car_tracker_updated_at');
          const localUpdatedAt = localUpdatedAtStr ? new Date(localUpdatedAtStr).getTime() : 0;

          if (localUpdatedAt > cloudUpdatedAt) {
            console.log("Local changes are newer than cloud. Syncing local state to cloud.");
            
            let finalVehicles = vehicles;
            let finalActiveId = activeVehicleId;
            let finalFuelLogs = fuelLogs;
            let finalMaintLogs = maintenanceLogs;

            const savedVehs = localStorage.getItem('car_tracker_vehicles_v2');
            const savedActiveId = localStorage.getItem('car_tracker_active_vehicle_id');
            const savedFuel = localStorage.getItem('car_tracker_fuel_logs_v2');
            const savedMaint = localStorage.getItem('car_tracker_maint_logs_v2');

            if (savedVehs) {
              try { finalVehicles = JSON.parse(savedVehs); } catch (e) {}
            }
            if (savedActiveId) {
              finalActiveId = savedActiveId;
            }
            if (savedFuel) {
              try { finalFuelLogs = JSON.parse(savedFuel); } catch (e) {}
            }
            if (savedMaint) {
              try { finalMaintLogs = JSON.parse(savedMaint); } catch (e) {}
            }

            const primaryVehicle = finalVehicles.find(v => v.id === finalActiveId) || finalVehicles[0] || INITIAL_VEHICLE;

            await saveUserData(userId, syncCode, primaryVehicle, finalFuelLogs, finalMaintLogs, finalVehicles, finalActiveId);
            
            setVehicles(finalVehicles);
            setActiveVehicleId(finalActiveId);
            setFuelLogs(finalFuelLogs);
            setMaintenanceLogs(finalMaintLogs);

            lastSavedRef.current = JSON.stringify({
              vehicles: finalVehicles,
              activeVehicleId: finalActiveId,
              fuelLogs: finalFuelLogs,
              maintenanceLogs: finalMaintLogs
            });
            setSyncStatus('connected');
            setCloudLoaded(true);
          } else {
            console.log("Cloud data is newer or equal to local. Loading cloud state.");
            const loadedVehs = cloudData.vehicles || (cloudData.vehicle ? [cloudData.vehicle] : [INITIAL_VEHICLE]);
            const loadedActiveId = cloudData.activeVehicleId || loadedVehs[0]?.id || 'vehicle-1';
            const loadedFuel = cloudData.fuelLogs || [];
            const loadedMaint = cloudData.maintenanceLogs || [];

            setVehicles(loadedVehs);
            setActiveVehicleId(loadedActiveId);
            setFuelLogs(loadedFuel);
            setMaintenanceLogs(loadedMaint);
            
            lastSavedRef.current = JSON.stringify({
              vehicles: loadedVehs,
              activeVehicleId: loadedActiveId,
              fuelLogs: loadedFuel,
              maintenanceLogs: loadedMaint
            });
            
            setSyncStatus('connected');
            setCloudLoaded(true);
          }
        } else {
          // If no cloud data exists yet, seed the cloud database with initial data
          await saveUserData(userId, syncCode, INITIAL_VEHICLE, INITIAL_FUEL_LOGS, INITIAL_MAINTENANCE_LOGS, [INITIAL_VEHICLE], INITIAL_VEHICLE.id);
          setVehicles([INITIAL_VEHICLE]);
          setActiveVehicleId(INITIAL_VEHICLE.id);
          setFuelLogs(INITIAL_FUEL_LOGS);
          setMaintenanceLogs(INITIAL_MAINTENANCE_LOGS);
          lastSavedRef.current = JSON.stringify({
            vehicles: [INITIAL_VEHICLE],
            activeVehicleId: INITIAL_VEHICLE.id,
            fuelLogs: INITIAL_FUEL_LOGS,
            maintenanceLogs: INITIAL_MAINTENANCE_LOGS
          });
          setSyncStatus('connected');
          setCloudLoaded(true); // Only mark as loaded when cloud seed is completely successful
        }
      } catch (err) {
        console.error("Erro ao inicializar dados com Firestore:", err);
        // offline/cache safety: If we already have cached local data, let the user inside in offline mode
        const cachedVehiclesExists = localStorage.getItem('car_tracker_vehicles_v2');
        if (cachedVehiclesExists) {
          console.warn("Utilizando cache local devido à indisponibilidade do servidor.");
          setSyncStatus('offline');
          setCloudLoaded(true);
        } else {
          setSyncStatus('error');
        }
      }
    }
    initCloudData();
  }, [userId]);

  // 2. Auto-save local updates to the cloud (with quick 500ms debounce)
  useEffect(() => {
    if (!cloudLoaded || !userId || !syncCode) return;

    const currentStr = JSON.stringify({ vehicles, activeVehicleId, fuelLogs, maintenanceLogs });
    if (currentStr === lastSavedRef.current) {
      return; // Skip syncing if the data hasn't changed from what is already on the server
    }

    setIsSyncing(true);
    setSyncStatus('syncing');

    const delayDebounceFn = setTimeout(() => {
      const primaryVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0] || INITIAL_VEHICLE;
      saveUserData(userId, syncCode, primaryVehicle, fuelLogs, maintenanceLogs, vehicles, activeVehicleId)
        .then(() => {
          lastSavedRef.current = currentStr;
          setSyncStatus('connected');
          setIsSyncing(false);
        })
        .catch((err) => {
          console.error("Erro ao sincronizar com Firestore:", err);
          setSyncStatus('error');
          setIsSyncing(false);
        });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [vehicles, activeVehicleId, fuelLogs, maintenanceLogs, userId, syncCode, cloudLoaded]);

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicle(updatedVehicle);
  };

  const handleAddVehicle = (e: FormEvent) => {
    e.preventDefault();
    setAddVehError(null);

    const name = addVehName.trim();
    const brand = addVehBrand.trim();
    const plate = addVehPlate.trim().toUpperCase();
    const odometerNum = parseInt(addVehOdometer, 10);

    if (!name) {
      setAddVehError('Por favor, informe o modelo do veículo.');
      return;
    }
    if (!plate) {
      setAddVehError('Por favor, informe a placa do veículo.');
      return;
    }
    if (isNaN(odometerNum) || odometerNum < 0) {
      setAddVehError('Por favor, informe um odômetro válido.');
      return;
    }

    // Check duplicate plate
    if (vehicles.some(v => v.plate && v.plate.toUpperCase() === plate)) {
      setAddVehError('Já existe um veículo cadastrado com esta placa na sua frota.');
      return;
    }

    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      brand,
      name,
      plate,
      year: addVehYear || String(new Date().getFullYear()),
      currentOdometer: odometerNum
    };

    setVehicles(prev => [...prev, newVehicle]);
    setActiveVehicleId(newVehicle.id);
    
    // Reset form
    setAddVehName('');
    setAddVehPlate('');
    setAddVehYear('');
    setAddVehOdometer('');
    setIsAddVehicleModalOpen(false);
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
      setVehicles([INITIAL_VEHICLE]);
      setActiveVehicleId(INITIAL_VEHICLE.id);
      setFuelLogs(INITIAL_FUEL_LOGS);
      setMaintenanceLogs(INITIAL_MAINTENANCE_LOGS);
    }
  };

  // Clear all data to start fresh
  const handleClearAllData = () => {
    if (confirm('Tem certeza de que deseja apagar TODOS os seus dados? Isso não pode ser desfeito.')) {
      const freshVehicle: Vehicle = {
        id: 'vehicle-1',
        name: 'Gol G4',
        brand: 'Volkswagen',
        plate: 'GOL-2026',
        year: '2008',
        currentOdometer: 120000,
      };
      setVehicles([freshVehicle]);
      setActiveVehicleId(freshVehicle.id);
      setFuelLogs([]);
      setMaintenanceLogs([]);
    }
  };

  // Handle portal login (simplified primary code access, with backup plate search)
  const handlePortalLogin = async (e: FormEvent) => {
    e.preventDefault();
    setPortalError(null);
    const searchCode = portalSyncCode.trim().toUpperCase();
    const searchPlate = portalPlate.trim().toUpperCase();
    
    if (!searchCode && !searchPlate) {
      setPortalError('Por favor, informe o seu Código de Acesso.');
      return;
    }

    setPortalLoading(true);
    try {
      let cloudData = null;
      if (searchCode) {
        cloudData = await findUserBySyncCode(searchCode);
      } else if (searchPlate) {
        cloudData = await findUserByPlate(searchPlate);
      }

      if (cloudData) {
        // Load the fleet vehicles, fallback gracefully to single vehicle representation for backward compatibility
        const loadedVehicles = cloudData.vehicles || (cloudData.vehicle ? [cloudData.vehicle] : [INITIAL_VEHICLE]);
        const loadedActiveId = cloudData.activeVehicleId || loadedVehicles[0]?.id || 'vehicle-1';

        setUserId(cloudData.userId);
        setSyncCode(cloudData.syncCode);
        setVehicles(loadedVehicles);
        setActiveVehicleId(loadedActiveId);
        setFuelLogs(cloudData.fuelLogs || []);
        setMaintenanceLogs(cloudData.maintenanceLogs || []);
        
        lastSavedRef.current = JSON.stringify({
          vehicles: loadedVehicles,
          activeVehicleId: loadedActiveId,
          fuelLogs: cloudData.fuelLogs || [],
          maintenanceLogs: cloudData.maintenanceLogs || []
        });
        setCloudLoaded(true);

        localStorage.setItem('golzinho_user_id', cloudData.userId);
        localStorage.setItem('golzinho_sync_code', cloudData.syncCode);
        localStorage.setItem('car_tracker_vehicles_v2', JSON.stringify(loadedVehicles));
        localStorage.setItem('car_tracker_active_vehicle_id', loadedActiveId);
        
        setIsIdentified(true);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        if (searchCode) {
          setPortalError('Código de acesso inválido ou inexistente.');
        } else {
          setPortalError(`Nenhuma frota encontrada com veículo de placa ${searchPlate}.`);
        }
      }
    } catch (err) {
      console.error("Erro ao autenticar no portal:", err);
      setPortalError('Ocorreu uma falha de conexão com a nuvem. Tente novamente.');
    } finally {
      setPortalLoading(false);
    }
  };

  // Handle portal vehicle registration (streamlined initial fleet creation)
  const handlePortalRegister = async (e: FormEvent) => {
    e.preventDefault();
    setPortalError(null);

    const plateVal = regPlate.trim().toUpperCase();
    const brandVal = regBrand.trim() || 'Volkswagen';
    const nameVal = regName.trim() || 'Gol G4';
    const yearVal = regYear.trim() || '2008';
    const odomVal = parseInt(regOdometer.trim()) || 120000;

    setPortalLoading(true);
    try {
      // If plate is provided, check for duplication
      if (plateVal) {
        const normalizedPlate = plateVal.replace(/[^A-Z0-9]/g, '');
        if (normalizedPlate.length >= 3) {
          const existing = await findUserByPlate(normalizedPlate);
          if (existing) {
            setPortalError(`A placa ${plateVal} já está cadastrada em uma frota! Use a aba de acesso.`);
            setPortalLoading(false);
            return;
          }
        }
      }

      const generatedId = `fleet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const generatedCode = generateSyncCode();
      const firstVehicle: Vehicle = {
        id: `vehicle-${Date.now()}`,
        name: nameVal,
        brand: brandVal,
        plate: plateVal || 'GOL-2026',
        year: yearVal || undefined,
        currentOdometer: odomVal,
      };

      // Save initial seeded state to cloud (seeds with initial templates so user has records to see)
      await saveUserData(generatedId, generatedCode, firstVehicle, INITIAL_FUEL_LOGS, INITIAL_MAINTENANCE_LOGS, [firstVehicle], firstVehicle.id);

      setUserId(generatedId);
      setSyncCode(generatedCode);
      setVehicles([firstVehicle]);
      setActiveVehicleId(firstVehicle.id);
      setFuelLogs(INITIAL_FUEL_LOGS);
      setMaintenanceLogs(INITIAL_MAINTENANCE_LOGS);
      lastSavedRef.current = JSON.stringify({
        vehicles: [firstVehicle],
        activeVehicleId: firstVehicle.id,
        fuelLogs: INITIAL_FUEL_LOGS,
        maintenanceLogs: INITIAL_MAINTENANCE_LOGS
      });
      setCloudLoaded(true);

      localStorage.setItem('golzinho_user_id', generatedId);
      localStorage.setItem('golzinho_sync_code', generatedCode);
      localStorage.setItem('car_tracker_vehicles_v2', JSON.stringify([firstVehicle]));
      localStorage.setItem('car_tracker_active_vehicle_id', firstVehicle.id);
      
      setIsIdentified(true);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao registrar frota:", err);
      setPortalError('Erro ao salvar veículo na nuvem. Verifique sua conexão.');
    } finally {
      setPortalLoading(false);
    }
  };

  // Disconnect active session
  const handleLogout = () => {
    if (confirm('Deseja desconectar? Seus dados continuam 100% seguros na nuvem e você poderá entrar novamente a qualquer momento digitando seu código de acesso.')) {
      localStorage.removeItem('golzinho_user_id');
      localStorage.removeItem('golzinho_sync_code');
      localStorage.removeItem('car_tracker_vehicle_v2');
      localStorage.removeItem('car_tracker_vehicles_v2');
      localStorage.removeItem('car_tracker_active_vehicle_id');
      localStorage.removeItem('car_tracker_fuel_logs_v2');
      localStorage.removeItem('car_tracker_maint_logs_v2');
      
      setUserId('');
      setSyncCode('');
      setVehicles([INITIAL_VEHICLE]);
      setActiveVehicleId(INITIAL_VEHICLE.id);
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
        // Load the fleet vehicles, fallback gracefully to single vehicle representation for backward compatibility
        const loadedVehicles = cloudData.vehicles || (cloudData.vehicle ? [cloudData.vehicle] : [INITIAL_VEHICLE]);
        const loadedActiveId = cloudData.activeVehicleId || loadedVehicles[0]?.id || 'vehicle-1';

        // Update local session
        setUserId(cloudData.userId);
        setSyncCode(cloudData.syncCode);
        setVehicles(loadedVehicles);
        setActiveVehicleId(loadedActiveId);
        setFuelLogs(cloudData.fuelLogs || []);
        setMaintenanceLogs(cloudData.maintenanceLogs || []);
        lastSavedRef.current = JSON.stringify({
          vehicles: loadedVehicles,
          activeVehicleId: loadedActiveId,
          fuelLogs: cloudData.fuelLogs || [],
          maintenanceLogs: cloudData.maintenanceLogs || []
        });
        setCloudLoaded(true);
        
        localStorage.setItem('golzinho_user_id', cloudData.userId);
        localStorage.setItem('golzinho_sync_code', cloudData.syncCode);
        localStorage.setItem('car_tracker_vehicles_v2', JSON.stringify(loadedVehicles));
        localStorage.setItem('car_tracker_active_vehicle_id', loadedActiveId);
        
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
      vehicles,
      activeVehicleId,
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
          const loadedVehicles = parsed.vehicles || (parsed.vehicle ? [parsed.vehicle] : [INITIAL_VEHICLE]);
          const loadedActiveId = parsed.activeVehicleId || loadedVehicles[0]?.id || 'vehicle-1';

          setVehicles(loadedVehicles);
          setActiveVehicleId(loadedActiveId);
          setFuelLogs(parsed.fuelLogs || []);
          setMaintenanceLogs(parsed.maintenanceLogs || []);
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

  // Computations (Scoped to active vehicle to function as a professional fleet manager)
  const activeFuelLogs = fuelLogs.filter((log) => log.vehicleId === activeVehicleId);
  const activeMaintenanceLogs = maintenanceLogs.filter((log) => log.vehicleId === activeVehicleId);

  const enrichedFuelLogs = enrichFuelLogsWithConsumption(activeFuelLogs);
  const overallStats = calculateOverallStats(vehicle.currentOdometer, activeFuelLogs, activeMaintenanceLogs);
  const monthlySpendData = getMonthlySpendData(activeFuelLogs, activeMaintenanceLogs);

  // Check for upcoming or overdue scheduled maintenance for active vehicle
  const scheduledServices = activeMaintenanceLogs.filter((m) => m.status === 'Agendada');
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

  if (userId && !cloudLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden" id="sync-loading-root">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-sm bg-slate-900 border border-slate-850 rounded-2xl shadow-2xl p-6 text-center relative z-10">
          {syncStatus === 'error' ? (
            <>
              <CloudOff className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Falha na Sincronização</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Não foi possível carregar os dados do veículo da nuvem de forma segura. Por favor, verifique sua conexão de internet.
              </p>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-6 w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Carregando da Nuvem</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Buscando todos os seus registros de abastecimento, consumo e manutenção salvos permanentemente na nuvem...
              </p>
              <div className="mt-4 text-[10px] text-slate-500 font-mono">
                ID do Veículo: {userId}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
              GOLZINHO <span className="text-emerald-500 font-black">FROTA</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Gerenciador Multiveículos Integrado</p>
            <p className="text-[11px] text-slate-500 mt-2 max-w-sm">
              Monitore despesas de combustível, custos de manutenção, consumo médio (km/L) e cronogramas de revisão para toda a sua frota em uma única conta.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => { setPortalTab('login'); setPortalError(null); }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                portalTab === 'login' 
                  ? 'border-emerald-500 text-emerald-500 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              Entrar na Frota
            </button>
            <button
              onClick={() => { setPortalTab('register'); setPortalError(null); }}
              className={`flex-1 pb-3 text-xs font-bold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                portalTab === 'register' 
                  ? 'border-emerald-500 text-emerald-500 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-350'
              }`}
            >
              Criar Nova Frota
            </button>
          </div>

          {/* Tab Content */}
          {portalTab === 'login' ? (
            <form onSubmit={handlePortalLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Código de Acesso Sincronizado</label>
                <input
                  type="text"
                  placeholder="Ex: GOL-123456"
                  value={portalSyncCode}
                  onChange={(e) => setPortalSyncCode(e.target.value.toUpperCase())}
                  className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-widest text-center text-sm"
                  disabled={portalLoading}
                />
                <p className="text-[9.5px] text-slate-500 mt-1.5 leading-relaxed">
                  Digite o código de 6 caracteres que foi gerado ao criar o seu painel de frota para sincronizar.
                </p>
              </div>

              {showPlateLogin && (
                <div className="pt-2 border-t border-slate-800/60 animate-in fade-in duration-200">
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Acessar pela Placa (Alternativo)</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234 ou GOL-2026"
                    value={portalPlate}
                    onChange={(e) => setPortalPlate(e.target.value.toUpperCase())}
                    className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-widest text-center text-sm"
                    disabled={portalLoading}
                  />
                </div>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowPlateLogin(!showPlateLogin)}
                  className="text-[9.5px] text-slate-500 hover:text-slate-350 hover:underline transition cursor-pointer"
                >
                  {showPlateLogin ? 'Ocultar campo de Placa' : 'Deseja pesquisar e acessar usando a Placa de um veículo?'}
                </button>
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando Frota...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" /> Entrar no Gerenciador de Frota
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePortalRegister} className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 text-slate-400 text-xs text-center">
                🚀 <strong className="text-white">Fácil e Sem Burocracia:</strong> Não é necessário digitar dados extensos. Clique no botão abaixo para criar seu espaço sincronizado de forma instantânea.
              </div>

              <div className="border-t border-slate-800/60 my-4 pt-3 space-y-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Configurar Primeiro Veículo (Opcional)</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Modelo</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Gol G4"
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs"
                      disabled={portalLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Placa</label>
                    <input
                      type="text"
                      placeholder="Ex: GOL-2026"
                      value={regPlate}
                      onChange={(e) => setRegPlate(e.target.value.toUpperCase())}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 font-mono text-xs uppercase"
                      disabled={portalLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Marca</label>
                    <input
                      type="text"
                      value={regBrand}
                      onChange={(e) => setRegBrand(e.target.value)}
                      placeholder="Ex: Volkswagen"
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs"
                      disabled={portalLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Odômetro Inicial</label>
                    <input
                      type="number"
                      value={regOdometer}
                      onChange={(e) => setRegOdometer(e.target.value)}
                      placeholder="Ex: 120000"
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs font-mono"
                      disabled={portalLoading}
                    />
                  </div>
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Criando Frota na Nuvem...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" /> Criar Frota & Acessar Instantaneamente
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

        {/* Fleet Manager Panel */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl shadow-lg" id="fleet-manager-section">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-500" />
                Gerenciador de Frota ({vehicles.length})
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Clique em um veículo para ver os dados específicos de consumo, alertas e custos.</p>
            </div>
            
            {/* Add vehicle to fleet button */}
            <button
              onClick={() => setIsAddVehicleModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Adicionar Veículo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {vehicles.map((v) => {
              const isActive = v.id === activeVehicleId;
              const vFuelLogs = fuelLogs.filter(log => log.vehicleId === v.id);
              const vMaintLogs = maintenanceLogs.filter(log => log.vehicleId === v.id);
              const vTotalSpent = vFuelLogs.reduce((acc, curr) => acc + curr.totalPrice, 0) + vMaintLogs.reduce((acc, curr) => acc + curr.cost, 0);
              
              return (
                <div
                  key={v.id}
                  onClick={() => setActiveVehicleId(v.id)}
                  className={`p-3.5 rounded-xl border transition duration-200 cursor-pointer flex flex-col justify-between relative group ${
                    isActive
                      ? 'bg-slate-950 border-emerald-500 shadow-md shadow-emerald-950/25'
                      : 'bg-slate-950/45 border-slate-850 hover:border-slate-700 hover:bg-slate-950/80'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold text-[8px] uppercase tracking-wider border border-emerald-500/20">
                      Ativo
                    </span>
                  )}
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">{v.plate || 'SEM PLACA'}</p>
                    <h4 className="font-extrabold text-xs text-slate-200 mt-1 uppercase group-hover:text-white transition">
                      {v.brand} {v.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Odômetro: <span className="text-white font-bold">{v.currentOdometer.toLocaleString('pt-BR')} KM</span>
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider">Gasto Total</span>
                      <span className="text-[10px] font-mono font-bold text-slate-300">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vTotalSpent)}
                      </span>
                    </div>
                    
                    {!isActive && vehicles.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja remover o veículo ${v.brand} ${v.name} (${v.plate}) da sua frota? Todos os abastecimentos e manutenções dele serão apagados.`)) {
                            setVehicles(prev => prev.filter(item => item.id !== v.id));
                            setFuelLogs(prev => prev.filter(log => log.vehicleId !== v.id));
                            setMaintenanceLogs(prev => prev.filter(log => log.vehicleId !== v.id));
                          }
                        }}
                        className="p-1 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 rounded-md text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Remover veículo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

      {/* Add Vehicle Modal */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsAddVehicleModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Adicionar Novo Veículo à Frota
            </h3>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Modelo do Veículo</label>
                <input
                  type="text"
                  value={addVehName}
                  onChange={(e) => setAddVehName(e.target.value)}
                  placeholder="Ex: Gol G4, Uno, Civic"
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Marca</label>
                  <input
                    type="text"
                    value={addVehBrand}
                    onChange={(e) => setAddVehBrand(e.target.value)}
                    placeholder="Volkswagen"
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Ano</label>
                  <input
                    type="text"
                    value={addVehYear}
                    onChange={(e) => setAddVehYear(e.target.value)}
                    placeholder="Ex: 2012"
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Placa</label>
                  <input
                    type="text"
                    value={addVehPlate}
                    onChange={(e) => setAddVehPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: GOL-2026"
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 font-mono text-xs uppercase focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Odômetro Atual (KM)</label>
                  <input
                    type="number"
                    value={addVehOdometer}
                    onChange={(e) => setAddVehOdometer(e.target.value)}
                    placeholder="Ex: 145000"
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {addVehError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-rose-400 text-xs text-center font-medium leading-relaxed">
                  {addVehError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  Adicionar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
