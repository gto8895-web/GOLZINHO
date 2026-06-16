import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MonthlySpend } from '../utils';
import { Fuel, Wrench, BarChart3, PieChartIcon } from 'lucide-react';

interface ChartsViewProps {
  monthlyData: MonthlySpend[];
  totalFuel: number;
  totalMaintenance: number;
}

export function ChartsView({ monthlyData, totalFuel, totalMaintenance }: ChartsViewProps) {
  const hasData = monthlyData.length > 0;
  
  const pieData = [
    { name: 'Combustível', value: totalFuel, color: '#10b981' }, // Emerald
    { name: 'Manutenção', value: totalMaintenance, color: '#6366f1' }, // Indigo
  ].filter(item => item.value > 0);

  // Formatting currency in BRL locale
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-view-container">
      {/* Spend Over Time Chart */}
      <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-850 p-5 shadow-lg flex flex-col h-[380px]" id="trend-chart-card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-500" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-wide">EVOLUÇÃO MENSAL DE GASTOS</h3>
          </div>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Últimos meses</p>
        </div>

        {!hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <BarChart3 className="w-10 h-10 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-300">Sem dados suficientes para gerar o gráfico</p>
            <p className="text-[10px] text-slate-500">Adicione lançamentos de gastos para alimentar as estatísticas.</p>
          </div>
        ) : (
          <div className="flex-1 w-full text-xs" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="monthLabel" 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#64748b" 
                  fontSize={11}
                  dy={10} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#64748b" 
                  fontSize={10}
                  tickFormatter={(val) => `R$ ${val}`} 
                />
                <Tooltip
                  cursor={{ fill: '#0f172a' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950 p-3 border border-slate-800 shadow-2xl rounded-lg">
                          <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1.5">{payload[0].payload.monthLabel}</p>
                          {payload.map((entry: any) => (
                            <div key={entry.name} className="flex items-center justify-between gap-6 text-xs mb-1 last:mb-0">
                              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name === 'fuel' ? 'Combustível' : 'Manutenção'}:
                              </span>
                              <span className="font-mono font-bold text-slate-200">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex items-center justify-between text-xs font-bold text-white">
                            <span>Total Geral:</span>
                            <span className="font-mono">{formatCurrency(payload[0].payload.total)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  iconSize={8}
                  formatter={(value) => <span className="text-xs font-medium text-slate-400 uppercase tracking-wider text-[10px] ml-1">{value === 'fuel' ? 'Combustível' : 'Manutenção'}</span>}
                />
                <Bar dataKey="fuel" name="fuel" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="maintenance" name="maintenance" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Expense Allocation Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-850 p-5 shadow-lg flex flex-col h-[380px]" id="breakdown-chart-card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4.5 h-4.5 text-emerald-500" />
            <h3 className="font-semibold text-slate-200 text-sm tracking-wide">DISTRIBUIÇÃO DE GASTOS</h3>
          </div>
        </div>

        {pieData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <PieChartIcon className="w-10 h-10 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-300">Sem dados detalhados</p>
            <p className="text-[10px] text-slate-500">Lance despesas para visualizar o rateio.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between" style={{ minHeight: 0 }}>
            {/* Pie Container */}
            <div className="flex-1 relative" style={{ minHeight: '160px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 px-2.5 py-1.5 border border-slate-800 shadow-xl rounded-md text-slate-200 text-[11px] font-mono">
                            {payload[0].name}: {formatCurrency(Number(payload[0].value))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Total overlay in center of Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold">Total Pago</span>
                <span className="text-sm font-mono font-bold text-white mt-0.5">
                  {formatCurrency(totalFuel + totalMaintenance)}
                </span>
              </div>
            </div>

            {/* Legend Labels */}
            <div className="space-y-1.5 mt-2">
              {pieData.map((item) => {
                const pct = (((item.value) / (totalFuel + totalMaintenance)) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-bold text-slate-350">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-mono font-bold text-white">{formatCurrency(item.value)}</p>
                      <p className="text-[9px] text-slate-500 font-bold tracking-tight">{pct}% do total</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
