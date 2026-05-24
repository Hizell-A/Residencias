import { useState, useEffect } from 'react';
import Dashboard from './Dashboard/Dashboard';
import Inventario from './Inventario/Inventario';
import Prestamos from './Prestamos/Prestamos';
import Devoluciones from './Devoluciones/Devoluciones';
import Beneficiarios from './Beneficiarios/Beneficiarios';
import Reportes from './Reportes/Reportes';
import Usuarios from './Usuarios/Usuarios';

// URL DE REDIRECCIÓN AL SSO EXTERNO
const EXTERNAL_LOGIN_URL = 'URL_DEL_LOGIN_EXTERNO_AQUI';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [beneficiariosInitialOpen, setBeneficiariosInitialOpen] = useState(false);
  const [prestamosInitialOpen, setPrestamosInitialOpen] = useState(false);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const verificarSesion = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/status`, {
          credentials: 'include',
        });
        
        // 🚨 SI EL SERVIDOR DICE QUE EL TOKEN NO VALE (401, 403, etc.)
        if (!response.ok) {
          throw new Error('Sesión inválida o expirada en el servidor');
        }
        
        const data = await response.json();
        setUsuario(data.usuario);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error de autenticación, redirigiendo al login:', error);
        
        // 🚀 ¡EL TRUCO MÁGICO!
        // Si la cookie no sirve o el backend se cayó, lo mandamos directo al Login Maestro (SSO)
        redirigirAlSSO();
      } finally {
        setIsLoading(false);
      }
    };

    const redirigirAlSSO = () => {
      // Validamos si la URL es un marcador de posición (placeholder) o una ruta relativa no configurada
      if (
        EXTERNAL_LOGIN_URL &&
        (EXTERNAL_LOGIN_URL.startsWith('http://') || EXTERNAL_LOGIN_URL.startsWith('https://'))
      ) {
        window.location.href = EXTERNAL_LOGIN_URL;
      } else {
        // Mostramos una alerta premium en el UI para guiar al usuario e impedir un bucle infinito
        setSessionError(
          'La sesión es inválida o ha expirado. Por favor, configura una URL de redirección absoluta y válida (ej. http://... o https://...) para habilitar la redirección automática del SSO.'
        );
      }
    };

    verificarSesion();
  }, []);

  useEffect(() => {
    if (usuario) {
      console.log('Sesión de usuario iniciada:', usuario.nombre || usuario.correo);
    }
  }, [usuario]);

  const handleLogout = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
    }

    setIsAuthenticated(false);
    setUsuario(null);
    localStorage.removeItem('usuario');
    
    if (
      EXTERNAL_LOGIN_URL &&
      (EXTERNAL_LOGIN_URL.startsWith('http://') || EXTERNAL_LOGIN_URL.startsWith('https://'))
    ) {
      window.location.href = EXTERNAL_LOGIN_URL;
    } else {
      setSessionError('Has cerrado sesión correctamente y la cookie ha sido eliminada. Configura la URL de redirección absoluta del SSO para habilitar la redirección automática.');
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'beneficiarios-nuevo') {
      setCurrentView('beneficiarios');
      setBeneficiariosInitialOpen(true);
      setPrestamosInitialOpen(false);
    } else if (view === 'prestamos-nuevo') {
      setCurrentView('prestamos');
      setPrestamosInitialOpen(true);
      setBeneficiariosInitialOpen(false);
    } else {
      setCurrentView(view);
      if (view !== 'beneficiarios') {
        setBeneficiariosInitialOpen(false);
      }
      if (view !== 'prestamos') {
        setPrestamosInitialOpen(false);
      }
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'inventario':
        return <Inventario onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'prestamos':
        return (
          <Prestamos 
            onLogout={handleLogout} 
            onNavigate={handleNavigate} 
            initialOpenForm={prestamosInitialOpen}
            onClearInitialAction={() => setPrestamosInitialOpen(false)}
          />
        );
      case 'devoluciones':
        return <Devoluciones onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'beneficiarios':
        return (
          <Beneficiarios 
            onLogout={handleLogout} 
            onNavigate={handleNavigate} 
            initialOpenForm={beneficiariosInitialOpen}
            onClearInitialAction={() => setBeneficiariosInitialOpen(false)}
          />
        );
      case 'reportes':
        return <Reportes onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'usuarios':
        return <Usuarios onLogout={handleLogout} onNavigate={handleNavigate} />;
      default:
        return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full mx-4 transition-all duration-300 hover:scale-105">
          <div className="relative w-16 h-16 mb-6">
            {/* Elegant glassmorphic spinner */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/50"></div>
            <div className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold tracking-wide text-sky-400 mb-2">Ortopedia Conectada</h2>
          <p className="text-sm text-slate-400 font-medium animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center p-8 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-black text-amber-500 mb-4">Acceso Requerido</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
            {sessionError}
          </p>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700 w-full mb-6 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Instrucciones de desarrollo:</p>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Abre <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400">frontend/src/App.tsx</code> y reemplaza la constante <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400">EXTERNAL_LOGIN_URL</code> con la dirección IP o dominio absoluto de tu SSO externo (ej. <code className="bg-slate-800 px-1.5 py-0.5 rounded text-[#94d6c6]">"https://sso.ortopedia.com/login"</code>).
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-2xl font-bold transition-all active:scale-[0.98]"
          >
            Reintentar Verificación
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated && renderView()}
    </>
  );
}

export default App;