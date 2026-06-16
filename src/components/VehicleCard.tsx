import { useState } from 'react';
import { Vehicle } from '../types';
import { Car, Edit2, Check, X, Shield, Calendar, Compass } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onUpdateVehicle: (updated: Vehicle) => void;
}

export function VehicleCard({ vehicle, onUpdateVehicle }: VehicleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(vehicle.name);
  const [brand, setBrand] = useState(vehicle.brand);
  const [plate, setPlate] = useState(vehicle.plate || '');
  const [year, setYear] = useState(vehicle.year || '');
  const [currentOdometer, setCurrentOdometer] = useState(String(vehicle.currentOdometer));
  const [renavam, setRenavam] = useState(vehicle.renavam || '');
  const [chassi, setChassi] = useState(vehicle.chassi || '');
  const [motorNumber, setMotorNumber] = useState(vehicle.motorNumber || '');
  const [power, setPower] = useState(vehicle.power || '');
  const [displacement, setDisplacement] = useState(vehicle.displacement || '');
  const [color, setColor] = useState(vehicle.color || '');

  const handleSave = () => {
    if (!name.trim() || !brand.trim()) return;
    onUpdateVehicle({
      ...vehicle,
      name: name.trim(),
      brand: brand.trim(),
      plate: plate.trim() || undefined,
      year: year.trim() || undefined,
      currentOdometer: parseInt(currentOdometer) || vehicle.currentOdometer,
      renavam: renavam.trim() || undefined,
      chassi: chassi.trim() || undefined,
      motorNumber: motorNumber.trim() || undefined,
      power: power.trim() || undefined,
      displacement: displacement.trim() || undefined,
      color: color.trim() || undefined
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(vehicle.name);
    setBrand(vehicle.brand);
    setPlate(vehicle.plate || '');
    setYear(vehicle.year || '');
    setCurrentOdometer(String(vehicle.currentOdometer));
    setRenavam(vehicle.renavam || '');
    setChassi(vehicle.chassi || '');
    setMotorNumber(vehicle.motorNumber || '');
    setPower(vehicle.power || '');
    setDisplacement(vehicle.displacement || '');
    setColor(vehicle.color || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-850 p-5 shadow-lg flex flex-col justify-between" id="vehicle-card-root">
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Car className="w-4.5 h-4.5 text-emerald-500" />
            <span className="font-semibold text-slate-200 text-sm tracking-wide">DADOS DO VEÍCULO</span>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 p-1 hover:bg-slate-800 rounded-lg transition"
            >
              <Edit2 className="w-3 h-3" /> Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="p-1 hover:bg-emerald-950/50 text-emerald-500 rounded-lg transition"
                title="Salvar"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg transition"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 text-xs text-slate-350">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Marca</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Modelo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Placa</label>
                <input
                  type="text"
                  placeholder="Ex: XYZ-1234"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Ano</label>
                <input
                  type="text"
                  placeholder="Ex: 2018"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Odômetro Atual (KM)</label>
                <input
                  type="number"
                  value={currentOdometer}
                  onChange={(e) => setCurrentOdometer(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Preto"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">RENAVAM</label>
                <input
                  type="text"
                  placeholder="Ex: 123456789"
                  value={renavam}
                  onChange={(e) => setRenavam(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Chassi</label>
                <input
                  type="text"
                  placeholder="Ex: 9BW..."
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Nº Motor</label>
                <input
                  type="text"
                  placeholder="Ex: 4G63"
                  value={motorNumber}
                  onChange={(e) => setMotorNumber(e.target.value)}
                  className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Potência</label>
                  <input
                    type="text"
                    placeholder="140 cv"
                    value={power}
                    onChange={(e) => setPower(e.target.value)}
                    className="px-1 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">Cil.</label>
                  <input
                    type="text"
                    placeholder="2.0"
                    value={displacement}
                    onChange={(e) => setDisplacement(e.target.value)}
                    className="px-1 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-slate-200 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
                {vehicle.brand}{' '}
                <span className="text-emerald-500 font-extrabold text-lg">{vehicle.name}</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 border border-slate-800/60 rounded-lg flex items-center gap-2 bg-slate-950/40">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-500 font-bold leading-none uppercase tracking-wider">Placa</p>
                  <p className="font-mono font-bold text-slate-300 mt-1 uppercase text-[11px]">
                    {vehicle.plate || 'Não inf.'}
                  </p>
                </div>
              </div>

              <div className="p-2.5 border border-slate-800/60 rounded-lg flex items-center gap-2 bg-slate-950/40">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-500 font-bold leading-none uppercase tracking-wider">Ano / Modelo</p>
                  <p className="font-bold text-slate-300 mt-1 text-[11px]">{vehicle.year || 'Não inf.'}</p>
                </div>
              </div>
            </div>

            {/* Additional parameters shown optional */}
            {(vehicle.renavam || vehicle.chassi || vehicle.motorNumber || vehicle.color || vehicle.power || vehicle.displacement) && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-350">
                {vehicle.renavam && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">RENAVAM</span>
                    <span className="font-mono font-semibold text-slate-300 text-[11px]">{vehicle.renavam}</span>
                  </div>
                )}
                {vehicle.chassi && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">Chassi</span>
                    <span className="font-mono font-semibold text-slate-300 text-[11px] uppercase truncate block" title={vehicle.chassi}>{vehicle.chassi}</span>
                  </div>
                )}
                {vehicle.motorNumber && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">Nº Motor</span>
                    <span className="font-mono font-semibold text-slate-300 text-[11px] uppercase truncate block" title={vehicle.motorNumber}>{vehicle.motorNumber}</span>
                  </div>
                )}
                {vehicle.color && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">Cor</span>
                    <span className="font-semibold text-slate-300 text-[11px] truncate block">{vehicle.color}</span>
                  </div>
                )}
                {vehicle.power && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">Potência</span>
                    <span className="font-semibold text-slate-300 text-[11px] truncate block">{vehicle.power}</span>
                  </div>
                )}
                {vehicle.displacement && (
                  <div className="bg-slate-950/30 p-1.5 px-2 rounded-lg border border-slate-800/40">
                    <span className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wider">Cilindrada</span>
                    <span className="font-semibold text-slate-300 text-[11px] truncate block">{vehicle.displacement}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-800" id="vehicle-odometer-section">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-emerald-500" /> QUILOMETRAGEM TOTAL
        </p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-mono font-bold text-white tracking-tight">
            {vehicle.currentOdometer.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs font-mono font-bold text-slate-500">KM</span>
        </div>
      </div>
    </div>
  );
}
