import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Send, AlertCircle, CheckCircle2, FileText, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/images/logo-lk-full.png'; 

const ComplaintsBookPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [isLoadingUbigeo, setIsLoadingUbigeo] = useState(true);

  // --- ESTADOS DEL UBIGEO ---
  const [allData, setAllData] = useState([]); // Toda la data del Perú
  const [departments, setDepartments] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Selecciones del usuario
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedProv, setSelectedProv] = useState("");
  const [selectedDist, setSelectedDist] = useState("");

  // --- EFECTO: CARGAR DATA REAL DE PERÚ AL INICIAR ---
  useEffect(() => {
    const fetchUbigeo = async () => {
      try {
        // Usamos un JSON público confiable con la estructura de árbol (Dep -> Prov -> Dist)
        const response = await fetch('https://raw.githubusercontent.com/ernestor/Ubigeo-Peru/master/json/ubigeo_peru_2019.json');
        const data = await response.json();
        setAllData(data);
        setDepartments(data); // Inicialmente los departamentos son la raíz
        setIsLoadingUbigeo(false);
      } catch (error) {
        console.error("Error al cargar ubigeo:", error);
        setIsLoadingUbigeo(false);
      }
    };
    fetchUbigeo();
  }, []);

  // --- MANEJADORES DE CAMBIO ---
  const handleDeptChange = (e) => {
    const deptId = e.target.value;
    setSelectedDept(deptId);
    setSelectedProv(""); // Reiniciar provincia
    setSelectedDist(""); // Reiniciar distrito
    setDistricts([]);    // Limpiar distritos

    // Buscar el departamento seleccionado para sacar sus provincias
    const deptObj = allData.find(d => d.id === deptId);
    if (deptObj) {
      setProvinces(deptObj.provincias);
    } else {
      setProvinces([]);
    }
  };

  const handleProvChange = (e) => {
    const provId = e.target.value;
    setSelectedProv(provId);
    setSelectedDist(""); // Reiniciar distrito

    // Buscar la provincia seleccionada dentro del departamento actual
    const deptObj = allData.find(d => d.id === selectedDept);
    if (deptObj) {
      const provObj = deptObj.provincias.find(p => p.id === provId);
      if (provObj) {
        setDistricts(provObj.distritos);
      } else {
        setDistricts([]);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validación extra de ubigeo
    if (!selectedDept || !selectedProv || !selectedDist) {
        alert("Por favor seleccione Departamento, Provincia y Distrito.");
        return;
    }

    setSubmitted(true);
    // Lógica futura para backend
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 500);
  };

  // --- VISTA DE ÉXITO ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">¡Reclamo Registrado!</h2>
          <p className="text-slate-600 mb-8">
            Hemos recibido su hoja de reclamación. Se ha enviado una copia detallada a su correo electrónico y nos pondremos en contacto dentro del plazo de ley (15 días hábiles).
          </p>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
            Volver al Inicio
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <img src={logo} alt="Constructora LYK" className="h-10 w-auto cursor-pointer" onClick={() => navigate('/')} />
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft size={16} /> Regresar
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
        >
          {/* ENCABEZADO DEL LIBRO */}
          <div className="bg-slate-900 p-8 md:p-10 text-center text-white relative overflow-hidden">
             {/* Decoración de fondo */}
             <div className="absolute top-0 right-0 p-4 opacity-5 transform rotate-12 translate-x-10 -translate-y-10">
                <BookOpen size={200} />
             </div>
             
             <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-4 flex items-center justify-center gap-3">
                   <BookOpen className="text-orange-500" size={36}/> Libro de Reclamaciones Virtual
                </h1>
                <p className="text-slate-300 max-w-2xl mx-auto text-sm leading-relaxed">
                   Conforme a lo establecido en el Código de Protección y Defensa del Consumidor, este establecimiento pone a su disposición este canal virtual para el registro de quejas y reclamos.
                </p>
                <div className="mt-6 flex justify-center">
                   <span className="px-4 py-1.5 rounded-full border border-orange-500/50 bg-orange-500/10 text-orange-400 text-xs font-bold tracking-widest uppercase">
                      Constructora e Inversiones L&K SAC
                   </span>
                </div>
             </div>
          </div>

          <div className="p-8 md:p-12">
             <form className="space-y-12" onSubmit={handleSubmit}>
                
                {/* === SECCIÓN 1: IDENTIFICACIÓN === */}
                <section>
                   <h3 className="text-lg font-bold text-slate-800 border-b-2 border-orange-500/20 pb-3 mb-8 flex items-center gap-3">
                      <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">1</span> 
                      Identificación del Consumidor Reclamante
                   </h3>
                   
                   <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre *</label>
                         <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="Nombres" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Primer Apellido *</label>
                         <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="Apellido Paterno" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Segundo Apellido *</label>
                         <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="Apellido Materno" />
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo Documento *</label>
                         <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none">
                            <option value="">Selección de documentación</option>
                            <option value="DNI">DNI</option>
                            <option value="CE">CE</option>
                            <option value="Pasaporte">Pasaporte</option>
                            <option value="RUC">RUC</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número Documento *</label>
                         <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Celular *</label>
                         <input required type="tel" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" />
                      </div>

                      {/* --- UBIGEO DINÁMICO --- */}
                      <div className="md:col-span-3 grid md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="md:col-span-3 text-xs font-bold text-orange-600 uppercase flex items-center gap-2">
                             <MapPin size={14}/> Ubicación del Consumidor
                          </div>
                          
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Departamento *</label>
                             <select 
                                required 
                                value={selectedDept} 
                                onChange={handleDeptChange} 
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-orange-500 outline-none"
                                disabled={isLoadingUbigeo}
                             >
                                <option value="">Seleccionar departamento</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                             </select>
                          </div>

                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Provincia *</label>
                             <select 
                                required 
                                value={selectedProv} 
                                onChange={handleProvChange} 
                                disabled={!selectedDept} 
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-orange-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                             >
                                <option value="">Seleccionar provincia</option>
                                {provinces.map(prov => (
                                    <option key={prov.id} value={prov.id}>{prov.name}</option>
                                ))}
                             </select>
                          </div>

                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Distrito *</label>
                             <select 
                                required 
                                value={selectedDist} 
                                onChange={(e) => setSelectedDist(e.target.value)} 
                                disabled={!selectedProv} 
                                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-orange-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                             >
                                <option value="">Seleccionar distrito</option>
                                {districts.map(dist => (
                                    <option key={dist.id} value={dist.id}>{dist.name}</option>
                                ))}
                             </select>
                          </div>
                      </div>
                      {/* ------------------------- */}

                      <div className="md:col-span-2 space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dirección *</label>
                         <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Referencia</label>
                         <input type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correo Electrónico *</label>
                         <input required type="email" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="ejemplo@correo.com" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-3">¿Eres menor de edad?</label>
                         <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="menor" value="si" className="accent-orange-600 w-5 h-5"/> Si
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="menor" value="no" defaultChecked className="accent-orange-600 w-5 h-5"/> No
                            </label>
                         </div>
                      </div>
                   </div>
                </section>

                {/* === SECCIÓN 2: DETALLE DEL RECLAMO === */}
                <section>
                   <h3 className="text-lg font-bold text-slate-800 border-b-2 border-orange-500/20 pb-3 mb-8 flex items-center gap-3">
                      <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">2</span> 
                      Detalle del Reclamo y Orden del Consumidor
                   </h3>

                   <div className="space-y-8">
                      {/* TIPOS - CARDS */}
                      <div className="grid md:grid-cols-2 gap-6">
                         {/* TIPO DE RECLAMO */}
                         <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">Tipo de Reclamo *</label>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 transition-colors">
                                    <input type="radio" name="tipo_reclamo" value="reclamacion" className="mt-1 accent-orange-600 w-5 h-5" required />
                                    <div>
                                        <span className="font-bold text-slate-800 block">Reclamación (1)</span>
                                        <span className="text-xs text-slate-500">Desacuerdo relacionado con productos y/o servicios.</span>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 transition-colors">
                                    <input type="radio" name="tipo_reclamo" value="queja" className="mt-1 accent-orange-600 w-5 h-5" required />
                                    <div>
                                        <span className="font-bold text-slate-800 block">Queja (2)</span>
                                        <span className="text-xs text-slate-500">Malestar o insatisfacción con la atención al público.</span>
                                    </div>
                                </label>
                            </div>
                         </div>

                         {/* TIPO DE CONSUMO */}
                         <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 block">Tipo de Consumo *</label>
                            <div className="flex gap-4 h-full items-start">
                                <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 transition-colors h-24">
                                    <input type="radio" name="tipo_consumo" value="producto" className="accent-orange-600 w-5 h-5" required />
                                    <span className="font-bold text-slate-700">Producto</span>
                                </label>
                                <label className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 transition-colors h-24">
                                    <input type="radio" name="tipo_consumo" value="servicio" className="accent-orange-600 w-5 h-5" required />
                                    <span className="font-bold text-slate-700">Servicio</span>
                                </label>
                            </div>
                         </div>
                      </div>

                      {/* DATOS DEL BIEN */}
                      <div className="grid md:grid-cols-4 gap-6">
                         <div className="space-y-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nº de Pedido *</label>
                            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all" />
                         </div>
                         <div className="space-y-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monto Reclamado (S/.)</label>
                            <input type="number" step="0.01" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all" placeholder="0.00" />
                         </div>
                         <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Proveedor</label>
                            <input type="text" defaultValue="Constructora e Inversiones L&K SAC" readOnly className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed" />
                         </div>
                         
                         <div className="space-y-2 md:col-span-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción del producto o servicio *</label>
                            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all" placeholder="Ej. Instalación eléctrica en..." />
                         </div>

                         {/* FECHAS */}
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Compra</label>
                            <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all text-slate-600" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Consumo</label>
                            <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all text-slate-600" />
                         </div>
                         <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Reclamación (Hoy)</label>
                            <input type="text" value={new Date().toLocaleDateString()} readOnly className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed" />
                         </div>
                         <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Caducidad</label>
                            <input type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 outline-none transition-all text-slate-600" />
                         </div>
                      </div>

                      {/* TEXT AREAS */}
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                               <FileText size={16}/> Detalle de la Reclamación / Queja *
                            </label>
                            <textarea required rows="5" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all resize-none" placeholder="Describa detalladamente los hechos según lo indicado por el cliente..."></textarea>
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                               <Send size={16}/> Pedido del Cliente *
                            </label>
                            <textarea required rows="3" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all resize-none" placeholder="¿Qué solución solicita?"></textarea>
                         </div>
                      </div>
                   </div>
                </section>

                {/* === TERMINOS Y CONDICIONES Y ACEPTACIÓN === */}
                <div className="bg-slate-50 rounded-2xl p-6 md:p-8 border border-slate-200">
                   <div className="space-y-4 text-xs text-slate-600 mb-8 text-justify leading-relaxed">
                      <p className="flex gap-2 items-start">
                         <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0 mt-0.5"/>
                         Declaro que soy el dueño del servicio y acepto el contenido de este formulario al declarar bajo Declaración Jurada la veracidad de los hechos descritos.
                      </p>
                      <p className="flex gap-2 items-start">
                         <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0 mt-0.5"/>
                         La formulación del reclamo no excluye el recurso a otros medios de resolución de controversias ni es un requisito previo para presentar una denuncia ante el Indecopi.
                      </p>
                      <p className="flex gap-2 items-start">
                         <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0 mt-0.5"/>
                         El proveedor debe responder a la reclamación en un plazo no superior a quince (15) días naturales, pudiendo ampliar el plazo hasta quince días.
                      </p>
                      <p className="flex gap-2 items-start">
                         <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0 mt-0.5"/>
                         Con la firma de este documento, el cliente autoriza a ser contactado después de la tramitación de la reclamación para evaluar la calidad y satisfacción del proceso de atención de reclamaciones.
                      </p>
                   </div>

                   <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-400 transition-colors mb-6 shadow-sm">
                      <input type="checkbox" required className="accent-orange-600 w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-bold text-slate-800">
                         He leído y acepto la Política de privacidad y seguridad y la Política de cookies.
                      </span>
                   </label>

                   <button disabled={submitted} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-xl hover:shadow-orange-500/20 flex justify-center items-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                      {submitted ? 'Enviando...' : <><Send size={20}/> Enviar Hoja de Reclamación</>}
                   </button>
                </div>

             </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ComplaintsBookPage;