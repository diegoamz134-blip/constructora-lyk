import React from 'react';

const DashboardPage = () => {
  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* --- SECCIÓN 1: Tarjetas de Resumen (Top Row) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta 1: Obras */}
        <StatCard 
            title="Obras Activas" 
            value="12" 
            trend="+2 nuevas" 
            trendUp={true}
            icon={<BuildingIcon />} 
            bgIcon="bg-blue-100 text-lk-darkblue"
        />

        {/* Tarjeta 2: Presupuesto */}
        <StatCard 
            title="Presupuesto Mensual" 
            value="S/ 85,240" 
            trend="-5% vs mes anterior" 
            trendUp={false}
            icon={<MoneyIcon />} 
            bgIcon="bg-yellow-100 text-yellow-600"
        />

        {/* Tarjeta 3: Personal */}
        <StatCard 
            title="Personal en Campo" 
            value="48" 
            trend="+4 activos hoy" 
            trendUp={true}
            icon={<GroupIcon />} 
            bgIcon="bg-green-100 text-green-600"
        />
      </div>

      {/* --- SECCIÓN 2: Paneles Detallados (Middle Row) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* Panel 1: Lista de Proyectos (Overview) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-800">Proyectos Recientes</h3>
             <button className="text-xs font-bold text-lk-blue bg-blue-50 px-3 py-1 rounded-full">Ver todos</button>
          </div>
          <div className="space-y-4 flex-1">
             <ProjectItem name="Residencial Los Álamos" status="En Proceso" amount="S/ 120k" color="text-green-500" />
             <ProjectItem name="Edificio Central Park" status="Retrasado" amount="S/ 450k" color="text-red-500" />
             <ProjectItem name="Remodelación Oficina" status="Finalizado" amount="S/ 25k" color="text-blue-500" />
             <ProjectItem name="Colegio San José" status="En Proceso" amount="S/ 80k" color="text-green-500" />
          </div>
        </div>

        {/* Panel 2: Gráfico Circular (Total Sale) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
           <h3 className="font-bold text-gray-800 mb-6 self-start w-full flex justify-between">
              Avance Global
              <span className="text-xs font-normal text-gray-400 bg-gray-50 px-2 py-1 rounded">Mensual</span>
           </h3>
           
           {/* Círculo Gráfico CSS */}
           <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                <circle cx="96" cy="96" r="88" stroke="#003366" strokeWidth="12" fill="transparent" 
                        strokeDasharray="552" strokeDashoffset="165" strokeLinecap="round" className="drop-shadow-lg" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-lk-darkblue">
                 <span className="text-4xl font-bold">70%</span>
                 <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Completado</span>
              </div>
           </div>
           
           <p className="text-center text-sm text-gray-500 mt-6 px-4">
             El avance general de obras está cumpliendo el cronograma estimado.
           </p>
        </div>

        {/* Panel 3: Actividad (Activity) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-800">Actividad Reciente</h3>
             <button className="text-xs font-bold text-white bg-lk-darkblue px-3 py-1 rounded-full">Hoy</button>
           </div>
           
           <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pl-6 pb-2">
              <TimelineItem 
                title="Nuevo Ticket Creado" 
                time="10:30 AM" 
                desc="El ingeniero Juan reportó falta de material."
                color="bg-red-500"
              />
              <TimelineItem 
                title="Avance registrado" 
                time="09:15 AM" 
                desc="Se completó el vaciado de techo en Obra A."
                color="bg-green-500"
              />
              <TimelineItem 
                title="Nuevo Usuario" 
                time="08:45 AM" 
                desc="Se registró un nuevo capataz en el sistema."
                color="bg-blue-500"
              />
              <TimelineItem 
                title="Inicio de Jornada" 
                time="07:30 AM" 
                desc="Asistencia marcada correctamente."
                color="bg-yellow-500"
              />
           </div>
        </div>

      </div>
    </div>
  );
};

/* --- SUBCOMPONENTES --- */

const StatCard = ({ title, value, trend, trendUp, icon, bgIcon }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
     <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${bgIcon}`}>
           {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
           {trend}
        </span>
     </div>
     <div>
       <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
       <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
     </div>
  </div>
);

const ProjectItem = ({ name, status, amount, color }) => (
  <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
     <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-lk-blue group-hover:text-white transition-colors">
          <FolderIcon />
        </div>
        <div>
           <p className="font-bold text-sm text-gray-700">{name}</p>
           <p className="text-xs text-gray-400">{status}</p>
        </div>
     </div>
     <span className={`font-bold text-sm ${color}`}>{amount}</span>
  </div>
);

const TimelineItem = ({ title, time, desc, color }) => (
  <div className="relative group cursor-default">
     <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${color}`}></div>
     <div className="flex justify-between items-center mb-1">
        <h5 className="font-bold text-sm text-gray-700">{title}</h5>
        <span className="text-[10px] text-gray-400 font-mono">{time}</span>
     </div>
     <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
  </div>
);

// --- ICONOS EXTRA ---
const BuildingIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const MoneyIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const GroupIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const FolderIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

export default DashboardPage;