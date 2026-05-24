import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import {
  Package,
  User,
  Calendar,
  Clock,
  UserPlus,
  Box,
  History,
  X,
  Printer,
  FileSpreadsheet,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';

interface PrestamosProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const Prestamos: React.FC<PrestamosProps> = ({ onLogout, onNavigate }) => {
  const [isRegisterLoanModalOpen, setIsRegisterLoanModalOpen] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const [formData, setFormData] = useState({
    beneficiario: '',
    aparato: '',
    cantidad: 1,
    fechaPrestamo: new Date().toISOString().split('T')[0],
    fechaDevolucion: '',
    observaciones: ''
  });

  const [inventario, setInventario] = useState<any[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<number | null>(null);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const filteredPrestamos = prestamos.filter((p) => {
    const beneficiario = p.nombre_beneficiario?.toLowerCase() || '';
    const articulo = p.nombre_articulo?.toLowerCase() || '';

    const matchSearch =
      beneficiario.includes(searchTerm.toLowerCase()) ||
      articulo.includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter ? p.estado_prestamo === statusFilter : true;

    return matchSearch && matchStatus;
  });

  const prestamosActivos = prestamos.filter(
    (p) => p.estado_prestamo === 'Activo'
  ).length;

  const prestamosVencidos = prestamos.filter(
    (p) =>
      p.estado_prestamo === 'Activo' &&
      new Date(p.fecha_limite_devolucion) < hoy
  ).length;

  const prestamosEsteMes = prestamos.filter((p) => {
    const fechaPrestamo = new Date(p.fecha_prestamo);
    const fechaActual = new Date();

    return (
      fechaPrestamo.getMonth() === fechaActual.getMonth() &&
      fechaPrestamo.getFullYear() === fechaActual.getFullYear()
    );
  }).length;

  const fetchDatos = async () => {
    try {
      const [invRes, benRes, presRes] = await Promise.all([
        fetch('http://localhost:3000/inventario'),
        fetch('http://localhost:3000/beneficiarios'),
        fetch('http://localhost:3000/prestamos')
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventario(invData.filter((item: any) => item.cantidad_disponible > 0));
      }

      if (benRes.ok) {
        setBeneficiarios(await benRes.json());
      }

      if (presRes.ok) {
        setPrestamos(await presRes.json());
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

 

  const handleExportCSV = () => {
    const csvContent = [
      ['Beneficiario', 'Articulo', 'Fecha Prestamo', 'Fecha Limite Devolucion', 'Estado'],
      ...filteredPrestamos.map((p) => [
        `"${p.nombre_beneficiario}"`,
        `"${p.nombre_articulo}"`,
        new Date(p.fecha_prestamo).toLocaleDateString(),
        new Date(p.fecha_limite_devolucion).toLocaleDateString(),
        p.estado_prestamo
      ])
    ]
      .map((e) => e.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `prestamos_${new Date().getTime()}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.beneficiario || !formData.aparato || !formData.fechaDevolucion) {
      alert('Por favor, selecciona beneficiario, aparato y fecha estimada de devolución.');
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];

    if (formData.fechaDevolucion < hoy) {
      alert('La fecha estimada de devolución no puede ser anterior a la fecha actual.');
      return;
    }

    const articulo = inventario.find(
      (i) => i.id_articulo === Number(formData.aparato)
    );

    if (articulo && articulo.cantidad_disponible <= 0) {
      alert('El artículo seleccionado no tiene stock disponible.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_articulo: formData.aparato,
          id_beneficiario: formData.beneficiario,
          fecha_limite_devolucion: formData.fechaDevolucion,
          observaciones: formData.observaciones
        })
      });

      if (response.ok) {
        const data = await response.json();

        const benName = beneficiarios.find(
          (b) => b.id_beneficiario === Number(formData.beneficiario)
        )?.nombre_completo;

        const artName = inventario.find(
          (i) => i.id_articulo === Number(formData.aparato)
        )?.nombre;

        setReceiptData({
          id_prestamo: data.prestamo.id_prestamo,
          nombre_beneficiario: benName,
          nombre_articulo: artName,
          fecha_prestamo: data.prestamo.fecha_prestamo || new Date(),
          fecha_limite_devolucion: formData.fechaDevolucion
        });

        alert('Préstamo registrado exitosamente');
        handleClear();
        fetchDatos();

        setIsRegisterLoanModalOpen(false);
        setIsReceiptModalOpen(true);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
        fetchDatos();
      }
    } catch (error) {
      console.error('Error al registrar préstamo:', error);
      alert('Error de conexión al registrar préstamo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      beneficiario: '',
      aparato: '',
      cantidad: 1,
      fechaPrestamo: new Date().toISOString().split('T')[0],
      fechaDevolucion: '',
      observaciones: ''
    });
    setCodigoInput('');
  };

  const DEFAULT_IMAGE = '/src/assets/logo.png';

  const beneficiarioOptions = beneficiarios.map((b: any) => ({
    value: b.id_beneficiario,
    label: b.nombre_completo
  }));

  const aparatoOptions = inventario.map((inv: any) => ({
    value: inv.id_articulo,
    label: inv.nombre
  }));

  const selectedApparatus = inventario.find(
    (i) => String(i.id_articulo) === String(formData.aparato)
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans relative overflow-hidden text-slate-900">
      <Sidebar
        activeView="prestamos"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Préstamos de Aparatos
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                Registrar y consultar préstamos activos
              </p>
            </div>

            <button
              onClick={() => setIsRegisterLoanModalOpen(true)}
              className="flex items-center gap-2 text-sm font-black text-[#5ba4c7] hover:bg-[#5ba4c7]/10 py-3 px-6 rounded-2xl transition-all border-2 border-[#5ba4c7]/10 hover:border-[#5ba4c7]/20"
            >
              <UserPlus size={18} />
              <span>Nuevo Préstamo</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-8 items-start">
            <div className="col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="bg-[#5ba4c7]/10 p-2.5 rounded-2xl">
                    <History className="text-[#5ba4c7] w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Préstamos Recientes
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Búsqueda, filtrado y control de préstamos
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="p-2 hover:bg-[#5ba4c7]/10 rounded-xl transition-colors text-[#5ba4c7] border border-[#5ba4c7]/20 flex items-center gap-2"
                >
                  <FileSpreadsheet size={20} />
                  <span className="text-xs font-bold">CSV</span>
                </button>
              </div>

              <div className="px-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Buscar beneficiario o artículo..."
                  className="px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5ba4c7]/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <select
                  className="px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5ba4c7]/50"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Devuelto">Devuelto</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="p-6 overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Beneficiario
                        </th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Aparato
                        </th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Devolución
                        </th>
                        <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Estado
                        </th>
                       
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {filteredPrestamos.map((p: any) => {
                        const isVencido =
                          p.estado_prestamo === 'Activo' &&
                          new Date(p.fecha_limite_devolucion) < hoy;

                        return (
                          <tr
                            key={p.id_prestamo}
                            className={`hover:bg-slate-50/50 transition-colors group ${
                              isVencido ? 'bg-red-50' : ''
                            }`}
                          >
                            <td
                              className="px-4 py-4 font-bold text-slate-900 text-sm group-hover:text-[#5ba4c7] transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedBeneficiaryId(p.id_beneficiario);
                                setIsBeneficiaryModalOpen(true);
                              }}
                            >
                              <span className="hover:underline">
                                {p.nombre_beneficiario}
                              </span>

                              {isVencido && (
                                <span
                                  className="ml-2 text-red-500 font-bold"
                                  title="Préstamo vencido"
                                >
                                  ⚠️
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-500 font-medium">
                              {p.nombre_articulo}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-500 font-medium">
                              {new Date(p.fecha_prestamo).toLocaleDateString()}
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-500 font-medium">
                              {new Date(p.fecha_limite_devolucion).toLocaleDateString()}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  p.estado_prestamo === 'Activo'
                                    ? isVencido
                                      ? 'bg-red-200 text-red-900 border-red-300'
                                      : 'bg-[#94d6c6] text-slate-900 border-[#94d6c6]/20'
                                    : p.estado_prestamo === 'Cancelado'
                                    ? 'bg-orange-200 text-orange-900 border-orange-300'
                                    : 'bg-slate-200 text-slate-600 border-slate-300'
                                }`}
                              >
                                {p.estado_prestamo}
                              </span>
                            </td>

                            
                          </tr>
                        );
                      })}

                      {filteredPrestamos.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500 font-medium"
                          >
                            No hay préstamos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <StatMiniCard
                icon={<Box size={24} />}
                iconColor="bg-white/20"
                bgColor="bg-[#94d6c6]"
                title="Préstamos Activos"
                value={prestamosActivos.toString()}
                subtitle={`${prestamosActivos} aparatos en préstamo`}
              />

              <StatMiniCard
                icon={<Clock size={24} />}
                iconColor="bg-white/20"
                bgColor="bg-[#ff8a71]"
                title="Vencidos"
                value={prestamosVencidos.toString()}
                subtitle="Requieren seguimiento"
              />

              <StatMiniCard
                icon={<UserPlus size={24} />}
                iconColor="bg-white/20"
                bgColor="bg-[#ffcc6f]"
                title="Este Mes"
                value={prestamosEsteMes.toString()}
                subtitle="Nuevos préstamos"
              />
            </div>
          </div>
        </div>
      </main>

      {isRegisterLoanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsRegisterLoanModalOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="bg-[#5ba4c7]/10 p-2.5 rounded-2xl">
                  <Package className="text-[#5ba4c7] w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Registrar Nuevo Préstamo
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Captura los datos del beneficiario y del aparato
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRegisterLoanModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-6">
                <SearchableSelect
                  label="Beneficiario"
                  icon={<User size={16} className="text-[#5ba4c7]" />}
                  placeholder="Seleccionar beneficiario"
                  options={beneficiarioOptions}
                  value={formData.beneficiario}
                  onChange={(val) => setFormData({ ...formData, beneficiario: val })}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                      <Package size={16} className="text-[#5ba4c7]" />
                      Código
                    </label>

                    <input
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all text-slate-600 font-medium placeholder:text-slate-400"
                      placeholder="Código..."
                      value={codigoInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCodigoInput(value);
                        const matchingArt = inventario.find(
                          (i) => (i.codigo_articulo || '').toLowerCase() === value.trim().toLowerCase()
                        );
                        if (matchingArt) {
                          setFormData((prev) => ({ ...prev, aparato: String(matchingArt.id_articulo) }));
                        } else {
                          setFormData((prev) => ({ ...prev, aparato: '' }));
                        }
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <SearchableSelect
                      label="Aparato a prestar"
                      icon={<Package size={16} className="text-[#5ba4c7]" />}
                      placeholder="Seleccionar aparato"
                      options={aparatoOptions}
                      value={formData.aparato}
                      onChange={(val) => {
                        setFormData((prev) => ({ ...prev, aparato: val }));
                        const art = inventario.find((i) => String(i.id_articulo) === String(val));
                        if (art) {
                          setCodigoInput(art.codigo_articulo || '');
                        } else {
                          setCodigoInput('');
                        }
                      }}
                    />
                  </div>
                </div>

                {selectedApparatus && (
                  <div className="flex items-center gap-6 p-5 bg-slate-50 border border-slate-100 rounded-3xl animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="relative group">
                      <img
                        src={selectedApparatus.imagen_url || DEFAULT_IMAGE}
                        alt={selectedApparatus.nombre}
                        onClick={() => setIsImageExpanded(true)}
                        className="w-20 h-20 object-cover rounded-2xl border border-slate-200/60 shadow-sm cursor-zoom-in hover:brightness-95 transition-all"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none">
                        <Search size={16} className="text-white drop-shadow" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#5ba4c7]/10 text-[#4a8ba9] uppercase tracking-wider">
                        {selectedApparatus.codigo_articulo || 'Sin código'}
                      </span>
                      <h4 className="text-base font-bold text-slate-800 truncate">
                        {selectedApparatus.nombre}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Stock disponible:{' '}
                        <span className="font-bold text-slate-700">
                          {selectedApparatus.cantidad_disponible} unidades
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                      <Calendar size={16} className="text-[#5ba4c7]" />
                      Fecha de préstamo
                    </label>

                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all text-slate-600 font-medium"
                      value={formData.fechaPrestamo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fechaPrestamo: e.target.value
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
                      <Calendar size={16} className="text-[#5ba4c7]" />
                      Fecha estimada de devolución
                    </label>

                    <input
                      type="date"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all text-slate-600 font-medium placeholder:text-slate-300"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.fechaDevolucion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fechaDevolucion: e.target.value
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">
                    Observaciones
                  </label>

                  <textarea
                    rows={4}
                    placeholder="Notas adicionales sobre el préstamo..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400 resize-none text-slate-600 font-medium"
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observaciones: e.target.value
                      })
                    }
                  ></textarea>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-8 py-3.5 text-sm font-bold text-slate-600 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-8 py-3.5 text-sm font-black text-white rounded-2xl shadow-lg transition-all active:scale-[0.98] ${
                    isLoading
                      ? 'bg-slate-400'
                      : 'bg-[#5ba4c7] hover:bg-[#4a8ba9] shadow-[#5ba4c7]/30'
                  }`}
                >
                  {isLoading ? 'Registrando...' : 'Registrar Préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReceiptModalOpen && receiptData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsReceiptModalOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#94d6c6]/20 text-[#4a8ba9] rounded-full flex items-center justify-center mb-4">
              <Package size={32} />
            </div>

            <h2 className="text-2xl font-black text-slate-900 mb-1">
              Comprobante
            </h2>

            <p className="text-slate-500 text-sm font-medium mb-6">
              Préstamo #{receiptData.id_prestamo}
            </p>

            <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 mb-6 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Beneficiario:</span>
                <span className="font-bold text-slate-800 text-right">
                  {receiptData.nombre_beneficiario}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Artículo:</span>
                <span className="font-bold text-slate-800 text-right">
                  {receiptData.nombre_articulo}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Fecha Préstamo:</span>
                <span className="font-bold text-slate-800 text-right">
                  {new Date(receiptData.fecha_prestamo).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Devolución:</span>
                <span className="font-bold text-slate-800 text-right">
                  {new Date(receiptData.fecha_limite_devolucion).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-300 text-center">
                <p className="text-slate-400 text-xs">Firma del Beneficiario</p>
              </div>
            </div>

            <div className="flex w-full gap-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={18} />
                Imprimir
              </button>

              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isBeneficiaryModalOpen && selectedBeneficiaryId && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsBeneficiaryModalOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl p-8 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Historial del Beneficiario
                </h3>

                <p className="text-sm text-slate-500 font-medium">
                  Todos los préstamos asociados
                </p>
              </div>

              <button
                onClick={() => setIsBeneficiaryModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">
                      Aparato
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">
                      Fechas
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {prestamos
                    .filter((p) => p.id_beneficiario === selectedBeneficiaryId)
                    .map((p: any) => (
                      <tr key={p.id_prestamo} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {p.nombre_articulo}
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {new Date(p.fecha_prestamo).toLocaleDateString()} -{' '}
                          {new Date(p.fecha_limite_devolucion).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              p.estado_prestamo === 'Activo'
                                ? 'bg-[#94d6c6] text-slate-900 border-[#94d6c6]/20'
                                : p.estado_prestamo === 'Cancelado'
                                ? 'bg-orange-200 text-orange-900 border-orange-300'
                                : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}
                          >
                            {p.estado_prestamo}
                          </span>
                        </td>
                      </tr>
                    ))}

                  {prestamos.filter(
                    (p) => p.id_beneficiario === selectedBeneficiaryId
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No hay historial para este beneficiario.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isImageExpanded && selectedApparatus && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setIsImageExpanded(false)}
          ></div>
          <div className="relative bg-white w-full max-w-[95vw] md:max-w-4xl lg:max-w-5xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] p-6 md:p-8">
            <button
              onClick={() => setIsImageExpanded(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 z-10"
            >
              <X size={24} />
            </button>
            
            <div className="flex-1 min-h-0 w-full flex items-center justify-center mb-6 mt-4">
              <img
                src={selectedApparatus.imagen_url || DEFAULT_IMAGE}
                alt={selectedApparatus.nombre}
                className="max-w-full max-h-[58vh] md:max-h-[65vh] object-contain rounded-2xl border border-slate-100 shadow-sm"
              />
            </div>
            
            <div className="text-center space-y-2 shrink-0">
              <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedApparatus.nombre}
              </h4>
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#5ba4c7]/10 text-[#4a8ba9] uppercase tracking-wider">
                  {selectedApparatus.codigo_articulo || 'Sin código'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {selectedApparatus.cantidad_disponible} disp.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatMiniCard = ({ icon, iconColor, title, value, subtitle, bgColor }: any) => (
  <div
    className={`${bgColor} p-8 rounded-[40px] shadow-sm flex items-center justify-between group hover:shadow-md transition-all`}
  >
    <div className="space-y-2">
      <p className="text-[10px] font-black text-slate-900/50 uppercase tracking-widest">
        {title}
      </p>

      <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
        {value}
      </h4>

      <p className="text-xs font-bold text-slate-900/40">{subtitle}</p>
    </div>

    <div
      className={`${iconColor} w-14 h-14 rounded-2xl flex items-center justify-center text-slate-900/80 shadow-sm group-hover:scale-110 transition-transform backdrop-blur-md`}
    >
      {icon}
    </div>
  </div>
);

interface SearchableSelectProps {
  label: string;
  icon?: React.ReactNode;
  placeholder: string;
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  icon,
  placeholder,
  options,
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <label className="text-sm font-bold text-slate-700 flex items-center gap-2 ml-1">
        {icon}
        {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-left text-slate-600 font-medium hover:bg-slate-100/50 hover:border-slate-200 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5"
      >
        <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[120] left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
          <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Search size={16} className="text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(String(opt.value));
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm transition-all font-medium ${
                      isSelected
                        ? 'bg-[#5ba4c7]/10 text-[#4a8ba9]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={16} className="text-[#4a8ba9]" />}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 text-sm font-medium">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Prestamos;