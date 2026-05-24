import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  RotateCcw,
  Users,
  BarChart3,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onLogout, onNavigate }) => {
  const [userName, setUserName] = useState('');
  const [userRol, setUserRol] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('usuario');

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.nombre?.split(' ')[0] || 'Usuario');
        setUserRol(user.rol || 'Administrador');
      } catch (error) {
        console.error('Error al parsear usuario:', error);
      }
    }
  }, []);

  const menuItems = [
    {
      view: 'dashboard',
      label: 'Inicio',
      icon: <LayoutDashboard size={19} />
    },
    {
      view: 'inventario',
      label: 'Inventario',
      icon: <Package size={19} />
    },
    {
      view: 'prestamos',
      label: 'Préstamos',
      icon: <ArrowLeftRight size={19} />
    },
    {
      view: 'devoluciones',
      label: 'Devoluciones',
      icon: <RotateCcw size={19} />
    },
    {
      view: 'beneficiarios',
      label: 'Beneficiarios',
      icon: <Users size={19} />
    },
    {
      view: 'reportes',
      label: 'Reportes',
      icon: <BarChart3 size={19} />
    }
  ];

  return (
    <aside className="w-64 bg-[#5ba4c7] flex flex-col h-full text-white shadow-2xl relative overflow-hidden">
      {/* Fondos decorativos suaves */}
      <div className="absolute -top-24 -left-24 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute top-40 -right-28 w-56 h-56 bg-[#94d6c6]/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 -left-28 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Logo */}
        <div className="mb-8">
          <div className="bg-white rounded-[30px] px-4 py-5 shadow-xl shadow-slate-900/10 border border-white/50">
            <img
              src="/src/assets/logo.png"
              alt="Palabras de Esperanza Logo"
              className="w-full h-auto object-contain drop-shadow-sm"
            />
          </div>


        </div>

        {/* Menú */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <NavItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </nav>

        {/* Usuario */}
        <div className="pt-6 border-t border-white/20 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[24px] bg-white/15 border border-white/15 backdrop-blur-md shadow-lg shadow-slate-900/5">
            <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center text-white font-black text-sm shadow-sm uppercase border border-white/20">
              {userName ? userName.charAt(0) : 'U'}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">
                {userName || 'Usuario'}
              </p>
              <p className="text-[10px] text-white/75 font-bold capitalize truncate">
                {userRol || 'Administrador'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 text-white/50 hover:text-white font-black text-sm px-4 py-3 rounded-2xl transition-all w-full text-left hover:bg-white/15 active:scale-[0.98]"
          >
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({
  icon,
  label,
  active = false,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-[22px] transition-all font-black text-sm text-left active:scale-[0.98] ${
      active
        ? 'bg-white/75 text-[#2f8caf] '
        : 'text-white/75 hover:text-white hover:bg-white/15'
    }`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-[#2f8c]"></span>
    )}

    <div
      className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
        active
          ? 'bg-[#5ba4c7]/10 text-[#2f8caf]'
          : 'bg-white/10 text-white/75 group-hover:bg-white/20 group-hover:text-white'
      }`}
    >
      {icon}
    </div>

    <span className="tracking-wide">{label}</span>
  </button>
);

export default Sidebar;