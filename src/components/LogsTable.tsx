import { useState } from 'react';
import { FuelLog, MaintenanceLog } from '../types';
import { Trash2, Search, Fuel, Wrench, ArrowDownUp, AlertCircle, ShoppingBag, MapPin, Navigation, AlertTriangle } from 'lucide-react';

interface LogsTableProps {
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  onDeleteFuelLog: (id: string) => void;
  onDeleteMaintLog: (id: string) => void;
}

type TabType = 'todos' | 'combustivel' | 'manutencao' | 'avarias' | 'agendamento';

interface UnifiedLog {
  id: string;
  type: 'fuel' | 'maint' | 'avaria';
  date: string;
  odometer: number;
  cost: number;
  title: string;
  subtitle: string;
  category: string;
  place?: string;
  status?: string;
  efficiency?: number; // km/L for fuel
}

export function LogsTable({ fuelLogs, maintenanceLogs, onDeleteFuelLog, onDeleteMaintLog }: LogsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Unified lists of logs
  const unifiedLogs: UnifiedLog[] = [
    ...fuelLogs.map((f) => ({
      id: f.id,
      type: 'fuel' as const,
      date: f.date,
      odometer: f.odometer,
      cost: f.totalPrice,
      title: `Abastecimento (${f.fuelType})`,
      subtitle: `${f.liters.toFixed(2)}L a R$ ${f.pricePerLiter.toFixed(2)}/L`,
      category: f.fuelType,
      place: f.gasStation,
      efficiency: f.consumptionKmL,
    })),
    ...maintenanceLogs.filter((m) => m.type !== 'Avaria').map((m) => ({
      id: m.id,
      type: 'maint' as const,
      date: m.date,
      odometer: m.odometer,
      cost: m.cost,
      title: m.description,
      subtitle: m.status === 'Agendada' ? 'Serviço Agendado' : 'Serviço Realizado',
      category: m.type,
      place: m.workshop,
      status: m.status,
    })),
    ...maintenanceLogs.filter((m) => m.type === 'Avaria').map((m) => ({
      id: m.id,
      type: 'avaria' as const,
      date: m.date,
      odometer: m.odometer,
      cost: m.cost,
      title: m.description,
      subtitle: 'Avaria Pendente',
      category: 'Avaria',
      place: m.workshop,
      status: 'Avaria',
    })),
  ];

  // Filters
  const filtered = unifiedLogs.filter((log) => {
    // 1. Tab filter
    if (activeTab === 'combustivel' && log.type !== 'fuel') return false;
    if (activeTab === 'manutencao' && (log.type !== 'maint' || log.status === 'Agendada')) return false;
    if (activeTab === 'agendamento' && (log.type !== 'maint' || log.status !== 'Agendada')) return false;
    if (activeTab === 'avarias' && log.type !== 'avaria') return false;

    // 2. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = log.title.toLowerCase().includes(q);
      const matchCategory = log.category.toLowerCase().includes(q);
      const matchPlace = log.place?.toLowerCase().includes(q) || false;
      const matchSubtitle = log.subtitle.toLowerCase().includes(q);
      return matchTitle || matchCategory || matchPlace || matchSubtitle;
    }

    return true;
  });

  // Sort by date
  filtered.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Format date
  const formatDatePT = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch (e) {
      return dateStr;
    }
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleDelete = (log: UnifiedLog) => {
    if (confirm(`Tem certeza que deseja excluir o registro "${log.title}"?`)) {
      if (log.type === 'fuel') {
        onDeleteFuelLog(log.id);
      } else {
        onDeleteMaintLog(log.id);
      }
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-850 p-5 shadow-lg space-y-4" id="logs-table-root">
      {/* Table header & filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-200 text-base tracking-wide uppercase">HISTÓRICO DE ATIVIDADES</h3>
          <p className="text-xs text-slate-500">Acompanhe todos os lançamentos cronologicamente</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por descrição, posto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex flex-wrap gap-1">
          {(['todos', 'combustivel', 'manutencao', 'avarias', 'agendamento'] as TabType[]).map((tab) => {
            const labels: { [key in TabType]: string } = {
              todos: 'Todos',
              combustivel: 'Combustível',
              manutencao: 'Manutenção',
              avarias: 'Avarias',
              agendamento: 'Agendados',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md text-xs font-semibold tracking-tight transition cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Sort Order Action */}
        <button
          onClick={toggleSort}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-800/40 transition cursor-pointer"
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
        </button>
      </div>

      {/* Active filters indicators */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <AlertCircle className="w-8 h-8 text-slate-600 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-350">Nenhum registro encontrado</p>
          <p className="text-[10px] text-slate-500">Tente limpar a pesquisa ou adicione um novo registro no painel.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 tracking-wider font-extrabold uppercase bg-slate-900">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Tipo / Registro</th>
                <th className="py-2.5 px-3">Odômetro</th>
                <th className="py-2.5 px-3">Eficiência / Detalhes</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const isFuel = log.type === 'fuel';
                const isScheduled = log.status === 'Agendada';
                const isAvaria = log.type === 'avaria';

                return (
                  <tr
                    key={`${log.type}-${log.id}`}
                    className={`border-b border-slate-850/60 hover:bg-slate-850/30 transition text-slate-300 text-xs ${
                      isScheduled ? 'bg-amber-955/10' : isAvaria ? 'bg-rose-955/10' : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-3 font-semibold text-slate-404 whitespace-nowrap">
                      {formatDatePT(log.date)}
                    </td>

                    {/* Class icon + Description / Title */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg flex-shrink-0 ${
                            isFuel
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                              : isAvaria
                              ? 'bg-rose-950/50 text-rose-400 border border-rose-900/30'
                              : isScheduled
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30'
                              : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/30'
                          }`}
                        >
                          {isFuel ? (
                            <Fuel className="w-3.5 h-3.5" />
                          ) : isAvaria ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div>
                          <p className="font-bold text-slate-200 line-clamp-1">{log.title}</p>
                          <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                            {log.place ? (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 flex-shrink-0 text-slate-600" /> {log.place}
                              </span>
                            ) : (
                              <span>Sem local registrado</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Odômetro */}
                    <td className="py-3 px-3 font-mono font-semibold text-slate-405 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-slate-600" />
                        {log.odometer.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-500">KM</span>
                      </span>
                    </td>

                    {/* Consumption efficiency / descriptive details */}
                    <td className="py-3 px-3">
                      {isFuel ? (
                        log.efficiency ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 font-bold font-mono text-[10px] border border-emerald-900/50">
                            {log.efficiency.toFixed(1)} km/L
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Média pendente</span>
                        )
                      ) : isAvaria ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/50 text-rose-400 border border-rose-900/30">
                          {log.subtitle}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            isScheduled
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-900/50'
                              : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/50'
                          }`}
                        >
                          {log.subtitle}
                        </span>
                      )}
                    </td>

                    {/* Cost amount */}
                    <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap text-xs ${
                      isScheduled ? 'text-amber-400' : isAvaria ? 'text-rose-400' : 'text-slate-100'
                    }`}>
                      {formatCurrency(log.cost)}
                    </td>

                    {/* Deletion action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(log)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
