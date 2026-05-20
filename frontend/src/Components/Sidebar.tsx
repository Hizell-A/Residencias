import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  RotateCcw,
  Users,
  BarChart3,
  UserCircle,
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
        setUserName(user.nombre.split(' ')[0]);
        setUserRol(user.rol);
      } catch (error) {
        console.error('Error al parsear usuario:', error);
      }
    }
  }, []);

  const menuItems = [
    {
      view: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />
    },
    {
      view: 'inventario',
      label: 'Inventario',
      icon: <Package size={20} />
    },
    {
      view: 'prestamos',
      label: 'Préstamos',
      icon: <ArrowLeftRight size={20} />
    },
    {
      view: 'devoluciones',
      label: 'Devoluciones',
      icon: <RotateCcw size={20} />
    },
    {
      view: 'beneficiarios',
      label: 'Beneficiarios',
      icon: <Users size={20} />
    },
    {
      view: 'reportes',
      label: 'Reportes',
      icon: <BarChart3 size={20} />
    },
    {
      view: 'usuarios',
      label: 'Usuarios',
      icon: <UserCircle size={20} />
    }
  ];

  return (
    <aside className="w-64 bg-[#5ba4c7] flex flex-col p-6 h-full text-white shadow-xl">
      <div className="flex flex-col items-center mb-10 px-2">
        <img
          src="/src/assets/logo.png"
          alt="Palabras de Esperanza Logo"
          className="w-full h-auto object-contain mb-2 drop-shadow-md"
        />
      </div>

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

      <div className="mt-auto pt-8 border-t border-white/10 flex flex-col gap-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/10 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shadow-sm uppercase">
            {userName ? userName.charAt(0) : 'U'}
          </div>

          <div>
            <p className="text-sm font-bold text-white">
              {userName || 'Usuario'}
            </p>
            <p className="text-[10px] text-white/70 font-medium capitalize">
              {userRol || 'Administrador'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-white font-black text-sm px-2 transition-all w-full text-left hover:opacity-70"
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
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
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all font-black text-sm text-left ${
      active
        ? 'bg-white/20 text-white'
        : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}
  >
    <div className={`${active ? 'opacity-100' : 'opacity-60'}`}>
      {icon}
    </div>
    <span className="tracking-wide">{label}</span>
  </button>
);

export default Sidebar;