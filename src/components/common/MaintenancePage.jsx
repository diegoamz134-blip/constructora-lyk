import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaintenancePage = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-100 border border-orange-100">
        <Construction size={48} strokeWidth={1.5} />
      </div>
      
      <h1 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">
        {title}
      </h1>
      
      <div className="h-1 w-20 bg-[#003366] rounded-full mb-6 mx-auto"></div>

      <p className="text-slate-500 text-lg max-w-md mb-8">
        Estamos trabajando en este módulo. <br />
        Próximamente estará disponible con todas sus funcionalidades.
      </p>

      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:text-[#003366] transition-all shadow-sm"
      >
        <ArrowLeft size={18} /> Volver
      </button>
    </div>
  );
};

export default MaintenancePage;