import React, { useState, useEffect } from 'react';
import { FuelLog, MaintenanceLog, FuelType, MaintenanceType } from '../types';
import { X, Calendar, Compass, DollarSign, Fuel, Wrench, Navigation, AlertTriangle } from 'lucide-react';

interface FuelFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<FuelLog, 'id' | 'vehicleId'>) => void;
  currentOdometer: number;
}

export function FuelFormModal({ isOpen, onClose, onSubmit, currentOdometer }: FuelFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>(String(currentOdometer));
  const [fuelType, setFuelType] = useState<FuelType>('Gasolina');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [gasStation, setGasStation] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Calcula o valor correspondente dependendo de qual campo o usuário digita
  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    const p = parseFloat(val);
    const t = parseFloat(totalPrice);
    if (!isNaN(p) && p > 0 && !isNaN(t)) {
      setLiters((t / p).toFixed(2));
    } else if (!isNaN(p) && p > 0) {
      const l = parseFloat(liters);
      if (!isNaN(l)) {
        setTotalPrice((p * l).toFixed(2));
      }
    }
  };

  const handleTotalChange = (val: string) => {
    setTotalPrice(val);
    const p = parseFloat(pricePerLiter);
    const t = parseFloat(val);
    if (!isNaN(p) && p > 0 && !isNaN(t)) {
      setLiters((t / p).toFixed(2));
    }
  };

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const p = parseFloat(pricePerLiter);
    const l = parseFloat(val);
    if (!isNaN(p) && p > 0 && !isNaN(l)) {
      setTotalPrice((p * l).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const odomNum = parseInt(odometer);
    const pLiterNum = parseFloat(pricePerLiter);
    const litersNum = parseFloat(liters);
    const totalNum = parseFloat(totalPrice);

    if (!date) return setError('Selecione uma data.');
    if (isNaN(odomNum) || odomNum <= 0) return setError('Odômetro inválido.');
    if (isNaN(pLiterNum) || pLiterNum <= 0) return setError('Preço por litro inválido.');
    if (isNaN(litersNum) || litersNum <= 0) return setError('Preencher quantidade de litros.');
    if (isNaN(totalNum) || totalNum <= 0) return setError('Valor total inválido.');

    onSubmit({
      date,
      odometer: odomNum,
      pricePerLiter: pLiterNum,
      liters: litersNum,
      totalPrice: totalNum,
      fuelType,
      gasStation: gasStation.trim() || undefined,
    });

    // Reset clean except the odometer for the next fill-up
    setPricePerLiter('');
    setLiters('');
    setTotalPrice('');
    setGasStation('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="fuel-modal-backdrop">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col" id="fuel-modal-container">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Fuel className="w-4.5 h-4.5 text-emerald-500" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">Registrar Abastecimento</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-950/50 text-red-400 text-xs rounded-lg border border-red-900/40 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Data</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Odômetro (KM)</label>
              <div className="relative">
                <Navigation className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="number"
                  placeholder="Ex: 110450"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Combustível</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Gasolina', 'Etanol', 'Diesel', 'GNV'] as FuelType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFuelType(type)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    fuelType === type
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-250 hover:bg-slate-850'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Preço / L (R$)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 left-2 top-2.5 absolute" />
                <input
                  type="number"
                  step="0.001"
                  placeholder="5.79"
                  value={pricePerLiter}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="pl-6 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total (R$)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 left-2 top-2.5 absolute" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 231.60"
                  value={totalPrice}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  className="pl-6 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Litros (L)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Calculado"
                value={liters}
                onChange={(e) => handleLitersChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Posto de Combustível (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Posto Ipiranga Centro"
              value={gasStation}
              onChange={(e) => setGasStation(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3.5 flex gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-850 text-slate-400 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs hover:bg-emerald-600/80 transition cursor-pointer"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MaintFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<MaintenanceLog, 'id' | 'vehicleId'>, relatedAvariaId?: string) => void;
  currentOdometer: number;
  avarias?: MaintenanceLog[];
}

export function MaintenanceFormModal({ isOpen, onClose, onSubmit, currentOdometer, avarias = [] }: MaintFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<MaintenanceType>('Óleo');
  const [odometer, setOdometer] = useState<string>(String(currentOdometer));
  const [cost, setCost] = useState<string>('');
  const [workshop, setWorkshop] = useState<string>('');
  const [status, setStatus] = useState<'Realizada' | 'Agendada'>('Realizada');
  const [nextOdometerLimit, setNextOdometerLimit] = useState<string>('');
  const [nextDateLimit, setNextDateLimit] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedAvariaId, setSelectedAvariaId] = useState<string>('');

  const types: MaintenanceType[] = ['Óleo', 'Filtro', 'Pneus', 'Freios', 'Suspensão', 'Elétrica', 'Motor', 'Outro'];

  const handleSelectAvaria = (avariaId: string) => {
    setSelectedAvariaId(avariaId);
    if (avariaId) {
      const selected = avarias.find(a => a.id === avariaId);
      if (selected) {
        setDescription(`Conserto de Avaria: ${selected.description}`);
        setType('Outro');
        if (selected.cost) {
          setCost(String(selected.cost));
        }
      }
    } else {
      setDescription('');
      setType('Óleo');
      setCost('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const odomNum = parseInt(odometer);
    const costNum = parseFloat(cost);
    const nextOdomNum = nextOdometerLimit ? parseInt(nextOdometerLimit) : undefined;

    if (!date) return setError('Selecione uma data.');
    if (!description.trim()) return setError('Preencha a descrição do serviço.');
    if (isNaN(odomNum) || odomNum <= 0) return setError('Odômetro inválido.');
    if (isNaN(costNum) || costNum < 0) return setError('Custo inválido.');
    if (nextOdomNum !== undefined && nextOdomNum <= odomNum) {
      return setError('O próximo odômetro deve ser maior que o atual.');
    }

    onSubmit({
      date,
      description: description.trim(),
      type,
      odometer: odomNum,
      cost: costNum,
      workshop: workshop.trim() || undefined,
      nextOdometerLimit: nextOdomNum,
      nextDateLimit: nextDateLimit || undefined,
      status,
    }, selectedAvariaId || undefined);

    // Reset clean
    setDescription('');
    setType('Óleo');
    setCost('');
    setWorkshop('');
    setNextOdometerLimit('');
    setNextDateLimit('');
    setStatus('Realizada');
    setSelectedAvariaId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="maint-modal-backdrop">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]" id="maint-modal-container">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Wrench className="w-4.5 h-4.5 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">Registrar Manutenção</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-955/50 border border-red-900/40 text-red-400 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatus('Realizada')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    status === 'Realizada'
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-400 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  Realizada
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Agendada')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    status === 'Agendada'
                      ? 'bg-amber-950/50 border-amber-500 text-amber-500 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  Agendada
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Data / Agendamento</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Avaria Relacionada (Opcional)</label>
            <select
              value={selectedAvariaId}
              onChange={(e) => handleSelectAvaria(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-150 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option className="bg-slate-900 text-slate-400" value="">-- Nenhuma avaria selecionada --</option>
              {avarias.map((avaria) => (
                <option className="bg-slate-900 text-slate-200" key={avaria.id} value={avaria.id}>
                  {avaria.date.split('-').reverse().join('/')} - {avaria.description} {avaria.cost ? `(Est: R$ ${avaria.cost.toFixed(2)})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Descrição do Serviço</label>
            <input
              type="text"
              placeholder="Ex: Troca de pastilhas de freio dianteiras"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Categoria de Manutenção</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {types.map((t) => (
                  <option className="bg-slate-900" key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Custo Total (R$)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 450.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Odômetro do Serviço (KM)</label>
              <div className="relative">
                <Navigation className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="number"
                  placeholder="Ex: 110900"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Oficina / Local (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Oficina Mecânica 3D"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Next due metrics */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2.5">
            <h4 className="text-[10px] font-bold text-slate-350 flex items-center gap-1.5 uppercase tracking-wide">
              <Compass className="w-3.5 h-3.5 text-emerald-500" /> Próxima Manutenção Recomendada
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Próxima Troca (KM)</label>
                <input
                  type="number"
                  placeholder="Ex: 120900"
                  value={nextOdometerLimit}
                  onChange={(e) => setNextOdometerLimit(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Próxima Data</label>
                <input
                  type="date"
                  value={nextDateLimit}
                  onChange={(e) => setNextDateLimit(e.target.value)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md w-full text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3.5 flex gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-850 text-slate-400 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-xs hover:bg-indigo-600/80 transition cursor-pointer"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AvariaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<MaintenanceLog, 'id' | 'vehicleId'>) => void;
  currentOdometer: number;
}

export function AvariaFormModal({ isOpen, onClose, onSubmit, currentOdometer }: AvariaFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<MaintenanceType>('Avaria');
  const [odometer, setOdometer] = useState<string>(String(currentOdometer));
  const [cost, setCost] = useState<string>('');
  const [workshop, setWorkshop] = useState<string>('');
  const [error, setError] = useState<string>('');

  const types: MaintenanceType[] = ['Óleo', 'Filtro', 'Pneus', 'Freios', 'Suspensão', 'Elétrica', 'Motor', 'Avaria', 'Outro'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const odomNum = parseInt(odometer);
    const costNum = parseFloat(cost);

    if (!date) return setError('Selecione uma data.');
    if (!description.trim()) return setError('Preencha a descrição da avaria.');
    if (isNaN(odomNum) || odomNum <= 0) return setError('Odômetro inválido.');
    if (isNaN(costNum) || costNum < 0) return setError('Custo inválido.');

    onSubmit({
      date,
      description: description.trim(),
      type,
      odometer: odomNum,
      cost: costNum,
      workshop: workshop.trim() || undefined,
      nextOdometerLimit: undefined,
      nextDateLimit: undefined,
      status: 'Realizada',
    });

    // Reset clean
    setDescription('');
    setType('Avaria');
    setCost('');
    setWorkshop('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="avaria-modal-backdrop">
      <div className="bg-slate-900 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]" id="avaria-modal-container">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
            <h3 className="font-semibold text-slate-100 text-sm tracking-wide uppercase">Registrar Avaria</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-955/50 border border-red-900/40 text-red-400 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Data da Ocorrência</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Descrição do Problema / Serviço</label>
            <input
              type="text"
              placeholder="Ex: Motor superaquecendo, barulho na suspensão"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Categoria</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-150 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {types.map((t) => (
                  <option className="bg-slate-900 text-slate-200" key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Custo Estimado (R$)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Odômetro Atual (KM)</label>
            <div className="relative">
              <Navigation className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="number"
                placeholder="Ex: 110900"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3.5 flex gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-850 text-slate-400 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs hover:bg-amber-600/80 transition cursor-pointer"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
