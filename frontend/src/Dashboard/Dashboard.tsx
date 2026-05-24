import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { 
  ArrowLeftRight, 
  RotateCcw, 
  Box,
  Wrench,
  AlertTriangle,
  TrendingUp,
  X,
  PhoneCall,
  UserPlus,
  FileText
} from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigate }) => {
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('todo');
  const [resumen, setResumen] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_dashboard_resumen');
      return cached ? JSON.parse(cached) : {
        total_aparatos: 0,
        total_prestados: 0,
        en_mantenimiento: 0,
        devoluciones_atrasadas: 0
      };
    } catch {
      return {
        total_aparatos: 0,
        total_prestados: 0,
        en_mantenimiento: 0,
        devoluciones_atrasadas: 0
      };
    }
  });
  const [actividades, setActividades] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cache_dashboard_actividades');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [morosidad, setMorosidad] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cache_dashboard_morosidad');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [userName, setUserName] = useState('');
  const [actividadMensual, setActividadMensual] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cache_dashboard_actividadMensual');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [inventarioCategoria, setInventarioCategoria] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cache_dashboard_inventarioCategoria');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Cargar datos de usuario del localStorage
    const userStr = localStorage.getItem('usuario');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.nombre.split(' ')[0]);
      
      } catch (e) {
        console.error("Error al parsear usuario:", e);
      }
    }
    fetch('http://localhost:3000/reportes/resumen')
      .then(res => res.json())
      .then(data => {
        setResumen(data);
        localStorage.setItem('cache_dashboard_resumen', JSON.stringify(data));
      })
      .catch(err => console.error("Error fetching resumen:", err));

    fetch('http://localhost:3000/dashboard/actividad')
      .then(res => res.json())
      .then(data => {
        setActividades(data);
        localStorage.setItem('cache_dashboard_actividades', JSON.stringify(data));
      })
      .catch(err => console.error("Error fetching actividad:", err));

    fetch('http://localhost:3000/reportes/morosidad')
      .then(res => res.json())
      .then(data => {
        setMorosidad(data);
        localStorage.setItem('cache_dashboard_morosidad', JSON.stringify(data));
      })
      .catch(err => console.error("Error fetching morosidad:", err));

    fetch('http://localhost:3000/reportes/prestamos-mes')
      .then(res => res.json())
      .then(data => {
        // Formatear meses de YYYY-MM a un nombre corto
        const formattedData = data.map((d: any) => {
          const date = new Date(d.mes + '-01T00:00:00');
          return {
            mes: date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
            total: d.total_prestamos
          };
        });
        setActividadMensual(formattedData);
        localStorage.setItem('cache_dashboard_actividadMensual', JSON.stringify(formattedData));
      })
      .catch(err => console.error("Error fetching actividad mensual:", err));

    fetch('http://localhost:3000/dashboard/inventario-categoria')
      .then(res => res.json())
      .then(data => {
        setInventarioCategoria(data);
        localStorage.setItem('cache_dashboard_inventarioCategoria', JSON.stringify(data));
      })
      .catch(err => console.error("Error fetching inventario categoria:", err));
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const hoyStr = new Date().toDateString();
  const actividadesHoy = actividades.filter(act => new Date(act.fecha).toDateString() === hoyStr);
  const prestamosHoy = actividadesHoy.filter(act => act.tipo === 'prestamo').length;
  const devolucionesHoy = actividadesHoy.filter(act => act.tipo === 'devolucion').length;

  const filteredActividades = actividades.filter(act => {
    if (selectedFilter === 'todo') return true;
    if (selectedFilter === 'prestamos') return act.tipo === 'prestamo';
    if (selectedFilter === 'devoluciones') return act.tipo === 'devolucion';
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans relative overflow-hidden text-slate-900">
      {/* Sidebar */}
      <Sidebar
  activeView="dashboard"
  onNavigate={onNavigate}
  onLogout={onLogout}
/>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-full scroll-smooth">
        <header className="h-24 bg-[#f3f4f6]/80 backdrop-blur-md flex items-center justify-between px-12 sticky top-0 z-20">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hola de nuevo, {userName || 'Usuario'}</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">Aquí tienes el resumen de hoy.</p>
            </div>

          </div>

        </header>

        <div className="px-12 pb-12 space-y-8">
          {/* Accesos Rápidos */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => onNavigate('prestamos-nuevo')} 
              className="flex items-center gap-3 px-6 py-5 bg-[#5ba4c7] hover:bg-[#4a8eb0] text-white rounded-[24px] shadow-lg shadow-[#5ba4c7]/30 transition-all font-black text-sm flex-1 justify-center hover:-translate-y-1"
            >
              <ArrowLeftRight size={22} />
              Registrar Préstamo
            </button>
            <button 
              onClick={() => onNavigate('devoluciones')} 
              className="flex items-center gap-3 px-6 py-5 bg-[#94d6c6] hover:bg-[#7bc2b1] text-slate-800 rounded-[24px] shadow-lg shadow-[#94d6c6]/30 transition-all font-black text-sm flex-1 justify-center hover:-translate-y-1"
            >
              <RotateCcw size={22} />
              Recibir Devolución
            </button>
            <button 
              onClick={() => onNavigate('beneficiarios-nuevo')} 
              className="flex items-center gap-3 px-6 py-5 bg-[#ff8a71] hover:bg-[#e6755e] text-white rounded-[24px] shadow-lg shadow-[#ff8a71]/30 transition-all font-black text-sm flex-1 justify-center hover:-translate-y-1"
            >
              <UserPlus size={22} />
              Nuevo Beneficiario
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-8">
            <StatCard icon={<Box size={24} />} iconColor="bg-white/20" value={resumen.total_aparatos.toString()} label="Total Aparatos" trend="En inventario" bgColor="bg-[#94d6c6]" />
            <StatCard icon={<ArrowLeftRight size={24} />} iconColor="bg-white/20" value={resumen.total_prestados.toString()} label="Préstamos Activos" trend="En uso actualmente" bgColor="bg-[#ffe4c4]" />
            <StatCard icon={<Wrench size={24} />} iconColor="bg-white/20" value={resumen.en_mantenimiento.toString()} label="En Mantenimiento" trend="En reparación" bgColor="bg-[#ff8a71]" />
            <StatCard icon={<AlertTriangle size={24} />} iconColor="bg-white/20" value={resumen.devoluciones_atrasadas.toString()} label="Devoluciones Atrasadas" trend="Requieren atención" bgColor="bg-[#ffcc6f]" />
          </div>

          {/* Alertas Operativas */}
          <div className="grid grid-cols-1 gap-8">
            {/* Morosidad Inmediata */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-6 border border-amber-100 relative overflow-hidden z-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10"></div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Aviso de Morosidad</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Devoluciones vencidas</p>
                </div>
                <div className="p-2 bg-amber-100 rounded-xl">
                  <PhoneCall size={18} className="text-amber-500" />
                </div>
              </div>
              
              <div className="space-y-4">
                {morosidad.length > 0 ? morosidad.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.beneficiario}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.aparato}</p>
                    </div>
                    <div className="text-right">
                      <div className="px-3 py-1 bg-rose-100 text-rose-600 rounded-md text-[10px] font-black uppercase tracking-widest mb-1">
                        -{item.dias_retraso} días
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold">{item.telefono}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 font-medium">No hay devoluciones vencidas.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Actividad Mensual (Line Chart) */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-6 border border-slate-50 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Actividad Mensual</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Préstamos vs Devoluciones</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <TrendingUp size={18} className="text-emerald-500" />
                </div>
              </div>
              
              <div className="h-48 relative mt-2 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={actividadMensual.length > 0 ? actividadMensual : [{ mes: 'Sin datos', total: 0 }]} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} dy={10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'black' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#emerald-gradient)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventario por Categoría */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-6 border border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Inventario por Categoría</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Distribución actual</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Box size={18} className="text-blue-500" />
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-4 px-2">
                {inventarioCategoria.length > 0 ? (() => {
                  const maxTotal = Math.max(...inventarioCategoria.map(i => i.total));
                  const colors = ['bg-[#5ba4c7]', 'bg-[#94d6c6]', 'bg-[#ffe4c4]', 'bg-[#ff8a71]', 'bg-[#ffcc6f]'];
                  
                  return inventarioCategoria.slice(0, 5).map((item, i) => {
                    const heightPercent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                        <span className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{item.total}</span>
                        <div 
                          className={`w-full ${colors[i % colors.length]} rounded-xl shadow-lg shadow-black/5 transition-all group-hover:opacity-80`} 
                          style={{ height: `${Math.max(heightPercent, 10)}%` }}
                        ></div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight h-8 flex items-center line-clamp-2" title={item.categoria}>
                          {item.categoria}
                        </span>
                      </div>
                    );
                  });
                })() : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-sm font-medium text-slate-400">Sin datos de categorías</p>
                  </div>
                )}
              </div>
            </div>
<link rel="icon" type="image/png" href="/src/assets/logo.png" />          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Actividad Reciente & Resumen Diario */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm space-y-8 border border-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Actividad Reciente</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1">Monitoreo de movimientos de hoy e histórico reciente</p>
                </div>
                <div className="px-6 py-2 bg-[#5ba4c7] text-white text-xs font-black uppercase tracking-widest rounded-full shadow-sm">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Panel Resumen del Día */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Resumen de Hoy</h4>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-black text-[#5ba4c7]">{prestamosHoy}</p>
                          <p className="text-xs font-bold text-slate-500">Préstamos Registrados</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#5ba4c7]/10 flex items-center justify-center text-[#5ba4c7]">
                          <ArrowLeftRight size={20} />
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-black text-[#94d6c6]">{devolucionesHoy}</p>
                          <p className="text-xs font-bold text-slate-500">Devoluciones Recibidas</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#94d6c6]/10 flex items-center justify-center text-[#94d6c6]">
                          <RotateCcw size={20} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <p className="text-xs text-slate-600 font-medium">
                      {actividadesHoy.length > 0 
                        ? `Se han registrado ${actividadesHoy.length} movimientos en total durante el día de hoy.` 
                        : "Aún no se han registrado movimientos el día de hoy."}
                    </p>
                    <button 
                      onClick={() => onNavigate('reportes')}
                      className="w-full py-2.5 bg-[#5ba4c7]/10 hover:bg-[#5ba4c7]/20 text-[#2f8caf] text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={14} />
                      Ver Reporte Detallado
                    </button>
                  </div>
                </div>

                {/* Listado de Actividad Reciente */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setSelectedFilter('todo')}
                      className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                        selectedFilter === 'todo' 
                          ? 'bg-[#5ba4c7] text-white shadow-md shadow-[#5ba4c7]/20' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      Todo
                    </button>
                    <button 
                      onClick={() => setSelectedFilter('prestamos')}
                      className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                        selectedFilter === 'prestamos' 
                          ? 'bg-[#5ba4c7] text-white shadow-md shadow-[#5ba4c7]/20' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      Préstamos
                    </button>
                    <button 
                      onClick={() => setSelectedFilter('devoluciones')}
                      className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-full transition-all ${
                        selectedFilter === 'devoluciones' 
                          ? 'bg-[#5ba4c7] text-white shadow-md shadow-[#5ba4c7]/20' 
                          : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      Devoluciones
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                    {filteredActividades.length > 0 ? (
                      filteredActividades.slice(0, 8).map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-pointer">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${activity.tipo === 'prestamo' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate">{activity.usuario}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-slate-600 flex-1 px-8 truncate text-center">
                            {activity.tipo === 'prestamo' ? 'Préstamo: ' : 'Devolución: '} {activity.aparato}
                          </p>
                          <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md border shrink-0 ${
                            activity.tipo === 'prestamo' 
                              ? 'bg-blue-50 text-blue-600 border-blue-100' 
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {formatTime(activity.fecha)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 font-medium text-center py-8">No hay registros de actividad para mostrar.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsActivityModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">Historial</h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="space-y-4">
                {actividades.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-[24px] hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                        activity.tipo === 'prestamo' ? 'bg-blue-400' : 'bg-emerald-400'
                      }`}>
                        {activity.tipo === 'prestamo' ? 'P' : 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {activity.tipo === 'prestamo' ? 'Préstamo' : 'Devolución'}
                        </p>
                        <p className="text-xs text-slate-500 font-bold">{activity.usuario} - {activity.aparato}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 font-bold">{formatTime(activity.fecha)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const StatCard = ({ value, label, icon, iconColor, trend, bgColor }: any) => (
  <div className={`${bgColor} p-8 rounded-[40px] shadow-sm space-y-4 group hover:shadow-md transition-all`}>
    <div className={`${iconColor} w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900/80 shadow-sm group-hover:scale-110 transition-transform backdrop-blur-md`}>
      {icon}
    </div>
    <div>
      <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
      <p className="text-sm font-bold text-slate-900/60 mt-1">{label}</p>
      <p className="text-[10px] font-black mt-3 uppercase tracking-widest text-slate-900/40">{trend}</p>
    </div>
  </div>
);

export default Dashboard;
