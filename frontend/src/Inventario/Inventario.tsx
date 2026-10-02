import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../Components/Sidebar';
import { 
  Search,
  Plus,
  Edit,
  Trash2,
  FilterX,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  History,
  ImagePlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface InventarioProps {
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export interface Articulo {
  id_articulo?: number;
  codigo_articulo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  cantidad_total: number;
  estado_fisico: string;
  fecha_ingreso?: string;
  imagen_url?: string;
}


//hola//

const DEFAULT_IMAGE = '/src/assets/logo.png';
const Inventario: React.FC<InventarioProps> = ({ onLogout, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas las categorías');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const [categorias, setCategorias] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cache_categorias');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  const [nuevaCatAbbr, setNuevaCatAbbr] = useState('');
  const [catActionLoading, setCatActionLoading] = useState(false);

  const fetchCategorias = async () => {
    try {
      const res = await fetch('http://localhost:3000/categorias', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      setCategorias(data);
      localStorage.setItem('cache_categorias', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

const [selectedItem, setSelectedItem] = useState<Articulo | null>(null);  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
  codigo_articulo: '',
  nombre: '',
  descripcion: '',
  categoria: categorias[0]?.categoria || 'Silla de ruedas',
  cantidad_total: 1,
  estado_fisico: 'Bueno',
  imagen_url: ''
});
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
  codigo_articulo: '',
  nombre: '',
  descripcion: '',
  categoria: categorias[0]?.categoria || 'Silla de ruedas',
  cantidad_total: 1,
  estado_fisico: 'Bueno',
  imagen_url: ''
});
    setIsModalOpen(true);
  };

 const handleEditClick = (item: Articulo) => {
  setEditingId(item.id_articulo || null);
  setFormData({
    codigo_articulo: item.codigo_articulo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    categoria: item.categoria,
    cantidad_total: item.cantidad_total,
    estado_fisico: item.estado_fisico,
    imagen_url: item.imagen_url || ''
  });
  setIsModalOpen(true);
};
  
  const [inventoryData, setInventoryData] = useState<Articulo[]>(() => {
    try {
      const cached = localStorage.getItem('cache_inventory');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('cache_inventory');
  });

const [formData, setFormData] = useState<Articulo>({
  codigo_articulo: '',
  nombre: '',
  descripcion: '',
  categoria: '',
  cantidad_total: 1,
  estado_fisico: 'Bueno',
  imagen_url: ''
});


useEffect(() => {
  fetchInventory();
  fetchCategorias();
}, []);

  const fetchInventory = async () => {
    try {
      if (!localStorage.getItem('cache_inventory')) {
        setLoading(true);
      }
      const res = await fetch('http://localhost:3000/inventario', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar el inventario');
      const data = await res.json();
      setInventoryData(data);
      localStorage.setItem('cache_inventory', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation
    if (!formData.nombre.trim()) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const url = editingId 
        ? `http://localhost:3000/inventario/${editingId}`
        : 'http://localhost:3000/inventario';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          cantidad_total: 1,
          cantidad_disponible: 1
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      
      if (editingId) {
        setInventoryData(prev => prev.map(item => item.id_articulo === editingId ? data.articulo : item));
        showToast('Artículo actualizado exitosamente', 'success');
      } else {
        setInventoryData(prev => [...prev, data.articulo]);
        showToast('Artículo guardado exitosamente', 'success');
      }
      
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Hubo un error al guardar el artículo', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/inventario/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      
      setInventoryData(prev => prev.filter(item => item.id_articulo !== id));
      showToast('Artículo eliminado exitosamente', 'success');
    } catch(err: any) {
      console.error(err);
      showToast(err.message || 'Error al eliminar el artículo', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
  const headers = ['Código', 'Nombre', 'Categoría', 'Estado', 'Descripción'];

  const rows = filteredData.map(item => [
    `"${item.codigo_articulo}"`,
    `"${item.nombre}"`,
    `"${item.categoria}"`,
    `"${item.estado_fisico}"`,
    `"${(item.descripcion || '').replace(/"/g, '""')}"`
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "reporte_inventario.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Inventario exportado correctamente', 'success');
};

  const filteredData = useMemo(() => {
    return inventoryData.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (item.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.codigo_articulo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Todas las categorías' || item.categoria === categoryFilter;
      const matchesStatus = statusFilter === 'Todos los estados' || item.estado_fisico === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventoryData, searchTerm, categoryFilter, statusFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.max(Math.ceil(filteredData.length / itemsPerPage), 1);

const handleOpenDetails = (item: Articulo) => {
  setSelectedItem(item);
};

const handleCloseDetails = () => {
  setSelectedItem(null);
};

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Selecciona un archivo de imagen válido', 'error');
    return;
  }

  const reader = new FileReader();

  reader.onloadend = () => {
    setFormData(prev => ({
      ...prev,
      imagen_url: reader.result as string
    }));
  };

  reader.readAsDataURL(file);
};

const handleRemoveImage = () => {
  setFormData(prev => ({
    ...prev,
    imagen_url: ''
  }));
};

  return (
    <div className="flex h-screen bg-[#f3f4f6] font-sans relative overflow-hidden text-slate-900">
      {/* Sidebar */}
      <Sidebar
  activeView="inventario"
  onNavigate={onNavigate}
  onLogout={onLogout}
/>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        

        <div className="p-10 space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Inventario de Aparatos</h2>
              <p className="text-slate-500 font-medium mt-1">Gestión y control de aparatos ortopédicos</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleExportCSV}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <Download size={20} strokeWidth={2.5} className="text-[#5ba4c7]" />
                <span>Exportar CSV</span>
              </button>
              <button 
                onClick={handleOpenNew}
                className="bg-[#5ba4c7] hover:bg-[#4a8ba9] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#5ba4c7]/30 transition-all active:scale-[0.98]"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>Agregar Aparato</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por código, nombre o descripción..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl text-slate-600 font-medium focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all cursor-pointer min-w-[200px]"
            >
              <option>Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.categoria}>{cat.categoria}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl text-slate-600 font-medium focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/5 focus:border-[#5ba4c7] transition-all cursor-pointer min-w-[200px]"
            >
              <option>Todos los estados</option>
              <option>Bueno</option>
              <option>Regular</option>
              <option>Malo</option>
              <option>Destruido</option>
            </select>
          </div>

          {/* Inventory Table Container with Scroll */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-y-auto max-h-[550px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300 transition-all">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm">
                  <tr className="border-b border-slate-100">
                   <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Código</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Estado</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</th>
                      <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                     <tr>
                        <td colSpan={6} className="px-8 py-10 text-center text-slate-500 font-medium">Cargando inventario...</td>
                     </tr>
                  ) : filteredData.length > 0 ? (
                    paginatedData.map((item) => (
                      <tr 
  key={item.id_articulo}
  onClick={() => handleOpenDetails(item)}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenDetails(item);
    }
  }}
  className="cursor-pointer hover:bg-[#e9f8fb] hover:shadow-[inset_5px_0_0_#5ba4c7] focus:bg-[#e9f8fb] focus:outline-none transition-all group"
>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{item.codigo_articulo}</td>
                        <td className="px-8 py-5 font-bold text-slate-900 text-sm group-hover:text-[#5ba4c7] transition-colors">{item.nombre}</td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{item.categoria}</td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm border ${
                            item.estado_fisico === 'Bueno' ? 'bg-[#94d6c6] text-slate-900 border-[#94d6c6]/20' :
                            item.estado_fisico === 'Regular' ? 'bg-[#5ba4c7] text-white border-[#5ba4c7]/20' :
                            item.estado_fisico === 'Destruido' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-[#ffcc6f] text-slate-900 border-[#ffcc6f]/20'
                          }`}>
                            {item.estado_fisico}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-medium">{item.descripcion}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button 
  className="p-2 text-[#5ba4c7] hover:bg-[#5ba4c7]/10 rounded-xl transition-all hover:scale-110" 
  title="Ver Historial"
  onClick={(e) => {
    e.stopPropagation();
  }}
>
  <History size={18} />
</button>
                            <button 
  className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all hover:scale-110" 
  title="Editar"
  onClick={(e) => {
    e.stopPropagation();
    handleEditClick(item);
  }}
>
  <Edit size={18} />
</button>
                            <button 
  className="p-2 text-[#ff8a71] hover:bg-[#ff8a71]/10 rounded-xl transition-all hover:scale-110" 
  title="Eliminar"
  onClick={(e) => {
    e.stopPropagation();
    handleDelete(item.id_articulo);
  }}
>
  <Trash2 size={18} />
</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-slate-50 p-6 rounded-full">
                            <FilterX className="text-slate-300 w-12 h-12" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-slate-900 font-bold text-lg">No se encontraron resultados</p>
                            <p className="text-slate-500 text-sm font-medium">Intenta ajustar los filtros o verifica el servidor</p>
                          </div>
                          <button 
                            onClick={() => {
                              setSearchTerm('');
                              setCategoryFilter('Todas las categorías');
                              setStatusFilter('Todos los estados');
                            }}
                            className="text-[#5ba4c7] font-bold text-sm hover:underline underline-offset-4 mt-2"
                          >
                            Limpiar todos los filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="bg-white px-8 py-5 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-500">
                  Mostrando <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}</span> a <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-bold text-slate-800">{filteredData.length}</span> aparatos
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Página Anterior"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-9 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          currentPage === pageNum 
                            ? 'bg-[#5ba4c7] text-white shadow-md shadow-[#5ba4c7]/20' 
                            : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Siguiente Página"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Agregar Aparato */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          ></div>

          <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Editar Aparato' : 'Agregar Nuevo Aparato'}</h3>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleSaveItem}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Código de Artículo</label>
                  <input 
                    type="text" 
                    value={editingId ? formData.codigo_articulo : "(Autogenerado)"}
                    disabled
                    placeholder="Ej: SR-001" 
                    className="w-full px-5 py-3 bg-slate-100 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400 text-slate-500 cursor-not-allowed"
                    required={!!editingId}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nombre del aparato</label>
                  <input 
                    type="text" 
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej: Silla de ruedas estándar" 
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-bold text-slate-700">Categoría</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-xs font-bold text-[#5ba4c7] hover:underline cursor-pointer focus:outline-none"
                    >
                      + Nueva Categoría
                    </button>
                  </div>
                  <select 
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all cursor-pointer"
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id_categoria} value={cat.categoria}>{cat.categoria}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Estado Físico</label>
                  <select 
                    value={formData.estado_fisico}
                    onChange={(e) => setFormData({...formData, estado_fisico: e.target.value})}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all cursor-pointer"
                  >
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Malo">Malo</option>
                    <option value="Destruido">Destruido</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 ml-1">
                  Imagen del aparato
                </label>

                <div className={editingId ? "grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-center" : "w-full"}>
                  {editingId && (
                    <div className="relative bg-slate-50 border border-slate-200 rounded-3xl h-40 flex items-center justify-center overflow-hidden">
                      <img 
                        src={formData.imagen_url || DEFAULT_IMAGE}
                        alt="Vista previa del aparato"
                        className="w-full h-full object-contain p-4"
                      />

                      {formData.imagen_url && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 shadow-sm flex items-center justify-center transition-all"
                          title="Quitar imagen"
                        >
                          <span className="text-lg font-bold">×</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center gap-3 px-5 py-6 bg-slate-50 border-2 border-dashed border-[#5ba4c7]/40 rounded-3xl cursor-pointer hover:bg-[#e9f8fb] hover:border-[#5ba4c7] transition-all">
                      <div className="w-12 h-12 rounded-2xl bg-[#5ba4c7]/10 text-[#5ba4c7] flex items-center justify-center">
                        <ImagePlus size={24} />
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-800">
                          Seleccionar imagen
                        </p>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          PNG, JPG o JPEG del aparato ortopédico
                        </p>
                      </div>

                      <input 
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    <p className="text-xs text-slate-400 font-medium">
                      Si no se selecciona una imagen, se usará temporalmente el logo del sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Descripción / Observaciones</label>
                <textarea 
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Detalles adicionales del aparato..." 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400 resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-8 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading}
                  className="px-8 py-3.5 text-sm font-bold text-white bg-[#5ba4c7] hover:bg-[#4a8ba9] rounded-2xl shadow-lg shadow-[#5ba4c7]/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  <span>{editingId ? 'Actualizar Aparato' : 'Guardar Aparato'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle del Aparato */}
{selectedItem && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div 
      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      onClick={handleCloseDetails}
    ></div>

    <div className="relative bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2">
        
        <div className="bg-[#e9f8fb] p-8 flex items-center justify-center">
          <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-6 w-full h-[320px] flex items-center justify-center">
            <img 
  src={selectedItem.imagen_url || DEFAULT_IMAGE}
  alt={selectedItem.nombre}
  className="max-w-full max-h-full object-contain"
/>
          </div>
        </div>

        <div className="p-8 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#5ba4c7] mb-2">
                Detalle del aparato
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900">
                {selectedItem.nombre}
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
Código: {selectedItem.codigo_articulo}              </p>
            </div>

            <button
              onClick={handleCloseDetails}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black transition-all"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Categoría
              </p>
              <p className="text-sm font-bold text-slate-800">
                {selectedItem.categoria}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Estado físico
              </p>
              <span className={`inline-flex px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm border ${
                selectedItem.estado_fisico === 'Bueno' ? 'bg-[#94d6c6] text-slate-900 border-[#94d6c6]/20' :
                selectedItem.estado_fisico === 'Regular' ? 'bg-[#5ba4c7] text-white border-[#5ba4c7]/20' :
                selectedItem.estado_fisico === 'Destruido' ? 'bg-red-100 text-red-800 border-red-200' :
                'bg-[#ffcc6f] text-slate-900 border-[#ffcc6f]/20'
              }`}>
                {selectedItem.estado_fisico}
              </span>
            </div>

            

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Descripción
              </p>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                {selectedItem.descripcion || 'Sin descripción registrada.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleCloseDetails}
              className="px-6 py-3 bg-[#5ba4c7] hover:bg-[#4a8ba9] text-white rounded-2xl font-bold shadow-lg shadow-[#5ba4c7]/30 transition-all active:scale-[0.98]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Modal Nueva Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCategoryModalOpen(false)}
          ></div>

          <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Agregar Nueva Categoría</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Registra una nueva categoría de aparatos</p>
            </div>

            <form 
              className="p-8 space-y-6" 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nuevaCatNombre.trim()) {
                  showToast('El nombre de la categoría es obligatorio', 'error');
                  return;
                }
                if (nuevaCatNombre.length > 100) {
                  showToast('El nombre debe tener máximo 100 caracteres', 'error');
                  return;
                }
                if (!nuevaCatAbbr.trim()) {
                  showToast('La abreviación es obligatoria', 'error');
                  return;
                }
                if (nuevaCatAbbr.length > 5) {
                  showToast('La abreviación debe tener máximo 5 caracteres', 'error');
                  return;
                }

                setCatActionLoading(true);
                try {
                  const res = await fetch('http://localhost:3000/categorias', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      categoria: nuevaCatNombre.trim(),
                      abreviacion: nuevaCatAbbr.trim()
                    })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Error al guardar la categoría');

                  showToast('Categoría guardada exitosamente', 'success');
                  
                  // Reload and select the newly added category
                  await fetchCategorias();
                  setFormData(prev => ({
                    ...prev,
                    categoria: data.categoria.categoria
                  }));

                  // Reset category inputs and close modal
                  setNuevaCatNombre('');
                  setNuevaCatAbbr('');
                  setIsCategoryModalOpen(false);
                } catch (err: any) {
                  console.error(err);
                  showToast(err.message || 'Error al guardar la categoría', 'error');
                } finally {
                  setCatActionLoading(false);
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Nombre de la Categoría</label>
                <input 
                  type="text" 
                  maxLength={100}
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  placeholder="Ej: Colchón de agua" 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400"
                  required
                />
                <span className="text-[10px] text-slate-400 block text-right font-medium">{nuevaCatNombre.length}/100</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Abreviación</label>
                <input 
                  type="text" 
                  maxLength={5}
                  value={nuevaCatAbbr}
                  onChange={(e) => setNuevaCatAbbr(e.target.value.toUpperCase())}
                  placeholder="Ej: CO" 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#5ba4c7]/10 focus:border-[#5ba4c7] transition-all placeholder:text-slate-400"
                  required
                />
                <span className="text-[10px] text-slate-400 block text-right font-medium">{nuevaCatAbbr.length}/5</span>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={catActionLoading}
                  className="px-6 py-3 text-sm font-bold text-white bg-[#5ba4c7] hover:bg-[#4a8ba9] rounded-2xl shadow-lg shadow-[#5ba4c7]/30 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                >
                  {catActionLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>Guardar</span>
                </button>
              </div>
            </form>

            {/* Divider and Category List */}
            <div className="p-8 pt-0 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 mb-4 ml-1">Categorías Existentes</h4>
              
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {categorias.map((cat) => (
                  <div 
                    key={cat.id_categoria} 
                    className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-100/50 transition-all"
                  >
                    <div>
                      <span className="font-bold text-sm text-slate-800">{cat.categoria}</span>
                      <span className="ml-2 text-[10px] font-bold text-[#5ba4c7] bg-[#5ba4c7]/10 px-2 py-0.5 rounded uppercase tracking-wider">{cat.abreviacion}</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`¿Estás seguro de eliminar la categoría "${cat.categoria}"?`)) return;
                        try {
                          const res = await fetch(`http://localhost:3000/categorias/${cat.id_categoria}`, {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Error al eliminar la categoría');

                          showToast(data.mensaje || 'Categoría eliminada exitosamente', 'success');
                          await fetchCategorias();
                        } catch (err: any) {
                          console.error(err);
                          showToast(err.message || 'No se pudo eliminar la categoría', 'error');
                        }
                      }}
                      className="p-1.5 text-[#ff8a71] hover:bg-[#ff8a71]/10 rounded-lg transition-all cursor-pointer focus:outline-none"
                      title="Eliminar Categoría"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Inventario;