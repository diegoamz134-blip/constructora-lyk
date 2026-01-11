import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, X, Phone, Mail, MapPin, ArrowRight, 
  CheckCircle2, Building2, Ruler, PhoneCall, ChevronDown,
  ChevronLeft, ChevronRight, BookOpen, HardHat 
} from 'lucide-react';

// IMÁGENES CORPORATIVAS
import logo from '../../assets/images/logo-lk-full.png'; 
import trabajadoresImg from '../../assets/images/trabajadores.png'; 

// IMÁGENES DE SERVICIOS (Asegúrate de tenerlas en la carpeta correcta)
import serv1 from '../../assets/images/servicios_1.png';
import serv2 from '../../assets/images/servicios_2.png';
import serv3 from '../../assets/images/servicios_3.png';
import serv4 from '../../assets/images/servicios_4.png';
import serv5 from '../../assets/images/servicios_5.png';

const ClientLandingPage = () => {
  const navigate = useNavigate();
  
  // ESTADOS
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('inicio');

  // --- DATOS ---

  const navLinks = [
    { name: 'Inicio', id: 'inicio' },
    { name: 'Nosotros', id: 'nosotros' },
    { name: 'Servicios', id: 'servicios' },
    { name: 'Proyectos', id: 'proyectos' },
    { name: 'Contacto', id: 'contacto' },
  ];

  const featuredProjects = [
    {
      id: 1,
      title: "Construcción de Cisternas y Potabilización UCS Villa El Salvador",
      location: "Villa El Salvador, Lima",
      image: serv1 // Placeholder, cambia por la foto real cuando la tengas
    },
    {
      id: 2,
      title: "Implementación Tienda Crisol Jockey - Happy Land",
      location: "Jockey Plaza, Lima",
      image: serv2 // Placeholder
    },
    {
      id: 3,
      title: "Remodelación de Fachada Pacífico - UTP Av. Arequipa 660",
      location: "Av. Arequipa, Lima",
      image: serv3 // Placeholder
    }
  ];

  const recentProjects = [
    "Instalación de Cerco Metálico UTP Huancayo",
    "Implementación de SSHH Piso 3 UTP San Juan de Lurigancho",
    "Instalación de Tabiquería Sistema Plyrock UTP Chimbote",
    "Instalaciones Eléctricas y Sanitarias de Open Plaza Pucallpa",
    "Instalaciones Eléctricas de la Vivienda Multif. Bonilla Sensse",
    "Ampliación de Camp Universitario UPN Etapa 2 - Chorrillos",
    "Implementación de Tienda Crisol Real Plaza Salaverry",
    "Implementación de Tienda Crisol en Cajamarca"
  ];

  const servicesData = [
    {
      img: serv1,
      title: "Servicio de Instalaciones Eléctricas, Sanitarias y Contra Incendios",
      desc: "Ofrecemos soluciones integrales en instalaciones eléctricas, sanitarias y contra incendios para una variedad de proyectos. Nuestro equipo altamente capacitado garantiza seguridad y calidad en cada fase del proceso, desde el diseño hasta la ejecución. Desde la instalación de sistemas eléctricos confiables hasta la implementación de sistemas contra incendios robustos, nos comprometemos a cumplir con los más altos estándares de la industria para satisfacer las necesidades de nuestros clientes."
    },
    {
      img: serv2,
      title: "Servicio de Instalaciones Eléctricas en Baja Tensión y Tableros Eléctricos",
      desc: "Nos especializamos en instalaciones eléctricas en baja tensión y suministro e instalación de tableros eléctricos de vanguardia. Nuestro equipo experto realiza pruebas meticulosas de megados y ejecuta sistemas de puesta a tierra eficientes para garantizar el rendimiento óptimo y seguro de sus instalaciones eléctricas. Confíe en nosotros para soluciones eléctricas confiables y adaptadas a sus necesidades específicas."
    },
    {
      img: serv3,
      title: "Servicio de Instalaciones Sanitarias Interiores y Sistemas de Bombeo de Agua",
      desc: "Proporcionamos instalaciones sanitarias interiores y suministro e instalación de sistemas de bombeo de agua y bombas sumergibles. Nuestro equipo garantiza la calidad y seguridad en cada proyecto, adaptando los sistemas a las necesidades de nuestros clientes. Desde la planificación hasta la implementación, nos comprometemos a brindar soluciones eficientes y confiables para garantizar su satisfacción."
    },
    {
      img: serv4,
      title: "Servicio de Instalación de Redes de Agua Contra Incendios y Cuartos de Máquinas",
      desc: "Ejecutamos la instalación de redes de agua contra incendios y suministro e implementación de cuartos de máquinas para una protección eficaz y segura. Nuestro equipo experto se encarga de cada detalle, asegurando la calidad y fiabilidad de cada componente. Confíe en nosotros para soluciones que cumplen con los más altos estándares de seguridad y satisfacen sus necesidades específicas."
    },
    {
      img: serv5,
      title: "Servicio de Obras Civiles y Acabados en General",
      desc: "Realizamos obras civiles y acabados en general, incluyendo construcción en sistema drywall, enchapados, pintura, carpintería en madera y metal, instalación de vidrios, entre otros servicios. Nuestro equipo experto se encarga de cada aspecto del proyecto, desde la planificación hasta la ejecución, garantizando resultados de alta calidad y satisfacción del cliente."
    }
  ];

  // --- FUNCIONES ---

  const nextProject = () => {
    setCurrentProjectIndex((prev) => (prev === featuredProjects.length - 1 ? 0 : prev + 1));
  };

  const prevProject = () => {
    setCurrentProjectIndex((prev) => (prev === 0 ? featuredProjects.length - 1 : prev - 1));
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    setActiveSection(id);
    
    // Pequeño timeout para dar tiempo a que se cierre el menú móvil si está abierto
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 100; // Ajuste para la barra fija
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 100);
  };

  // --- EFECTOS ---

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Scroll Spy (Detector de sección activa)
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px', // Detecta el elemento cuando está al centro
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    navLinks.forEach(link => {
      const element = document.getElementById(link.id);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // --- VARIANTES DE ANIMACIÓN ---
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 50, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50, damping: 20 } } };
  const slideInLeft = { hidden: { x: -100, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 60, damping: 20, duration: 1 } } };
  const slideInRight = { hidden: { x: 100, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 60, damping: 20, duration: 1 } } };

  return (
    <div className="font-sans text-slate-800 bg-white selection:bg-orange-500 selection:text-white overflow-x-hidden">

      {/* --- NAVBAR --- */}
      <nav 
        className={`fixed w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('inicio')}>
            <img src={logo} alt="Constructora LYK" className="h-12 w-auto object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.id)}
                className={`text-sm font-semibold tracking-wide transition-colors relative group ${
                  activeSection === link.id 
                    ? 'text-orange-600' 
                    : (isScrolled ? 'text-slate-800 hover:text-orange-600' : 'text-slate-900 hover:text-orange-600')
                }`}
              >
                {link.name}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-orange-600 transition-all duration-300 ${
                  activeSection === link.id ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </button>
            ))}
            <button 
              onClick={() => scrollToSection('contacto')}
              className="px-6 py-2 bg-orange-600 text-white rounded-full font-bold text-sm hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-500/30 transform hover:-translate-y-0.5"
            >
              Cotizar
            </button>
          </div>

          <button 
            className="md:hidden text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-100 overflow-hidden shadow-2xl absolute w-full top-full left-0"
            >
              <div className="flex flex-col p-6 gap-4">
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.id)}
                    className={`text-left text-lg font-bold border-b border-slate-100 pb-3 transition-colors ${
                       activeSection === link.id ? 'text-orange-600' : 'text-slate-800'
                    }`}
                  >
                    {link.name}
                  </button>
                ))}
                <button 
                  onClick={() => scrollToSection('contacto')}
                  className="mt-2 w-full py-3 bg-orange-600 text-white rounded-xl font-bold text-center hover:bg-orange-700 transition-all"
                >
                  Solicitar Cotización
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* --- INICIO (HERO) --- */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-orange-50/50 to-transparent hidden lg:block skew-x-12 translate-x-20" />
        
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10 w-full">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-bold uppercase tracking-wider shadow-sm">
              <CheckCircle2 size={16} /> Excelencia en Construcción
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight">
              BIENVENIDOS
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg lg:text-xl text-slate-600 leading-relaxed border-l-4 border-orange-500 pl-6">
              Somos una empresa dedicada a brindar soluciones de ingeniería, procura y construcción en las especialidades de arquitectura, estructuras, instalaciones eléctricas, sanitarias, mecánicas, comunicaciones y sistemas especiales.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => scrollToSection('nosotros')}
                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex justify-center items-center gap-3 group"
              >
                Conócenos <ChevronDown className="group-hover:translate-y-1 transition-transform" />
              </button>
              <button 
                onClick={() => scrollToSection('contacto')}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:border-orange-500 hover:text-orange-600 transition-all flex justify-center items-center gap-2"
              >
                Contactar
              </button>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 100, rotate: 2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, type: "spring" }}
            className="relative hidden lg:block"
          >
             <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group">
                <img 
                  src={trabajadoresImg} 
                  alt="Equipo de Trabajo Constructora LYK" 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500 p-3 rounded-xl shadow-lg shadow-orange-500/40">
                      <UsersIcon />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Equipo Altamente Calificado</p>
                      <p className="text-slate-200 text-sm">Ingenieros y técnicos expertos</p>
                    </div>
                  </div>
                </motion.div>
             </div>
             <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-orange-200 rounded-[2.5rem] rotate-6 opacity-40"></div>
          </motion.div>
        </div>
      </section>

      {/* --- NOSOTROS (ANIMACIÓN LATERAL) --- */}
      <section id="nosotros" className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="mb-20 mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={slideInLeft}
          >
            <div className="text-center mb-12">
               <h2 className="text-orange-600 font-bold tracking-[0.2em] uppercase text-sm mb-4">Sobre Nosotros</h2>
               <h3 className="text-4xl md:text-5xl font-black text-slate-900">Constructora e Inversiones L&K SAC</h3>
               <div className="h-1 w-32 bg-orange-500 mx-auto rounded-full mt-6"></div>
            </div>

            <div className="prose prose-lg text-slate-600 mx-auto max-w-5xl text-justify space-y-6 leading-relaxed">
              <p>
                La empresa <strong>Constructora e Inversiones L&K SAC</strong> es de accionistas peruanos que contribuye con el desarrollo del país, a través de la dirección y ejecución de proyectos de construcción.
              </p>
              <p>
                Contamos con profesionales de amplia experiencia en la gestión y ejecución de proyectos integrales de gran envergadura como centros comerciales, supermercados, cines, universidades, plantas industriales, bancos, edificios de oficinas y edificios de viviendas multifamiliares.
              </p>
              <p>
                Brindamos asesoramiento a nuestros clientes en Gestión Integral de Proyectos utilizando herramientas de gestión alineadas con las buenas prácticas del PMI. Nuestro objetivo es optimizar los proyectos enfocándonos en costos, tiempos, calidad y seguridad, acorde con las exigencias propias de la construcción.
              </p>
              <p className="font-semibold text-slate-800 bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                Contamos con certificaciones homologadas con: MEGA, CFR, SQR, Hodelpe.
              </p>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
              variants={slideInLeft} 
              className="group p-10 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-150 duration-500">
                  <Ruler size={64} />
                </div>
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-orange-600 mb-8 shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Ruler size={32} />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Misión</h4>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base text-justify">
                  Nos dedicamos a proporcionar a los sectores inmobiliarios y de construcción los elementos necesarios para el desarrollo exitoso de sus proyectos. Ya sea para edificaciones nuevas, remodelaciones o ampliaciones de instalaciones, ofrecemos soluciones integrales que abarcan desde la planificación inicial hasta la ejecución y entrega final. Nuestro compromiso es brindar servicios y productos de calidad que impulsen el progreso en cada proyecto.
                </p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
              variants={slideInRight} 
              className="group p-10 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-150 duration-500">
                  <Building2 size={64} />
                </div>
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-orange-600 mb-8 shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Building2 size={32} />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-4">Visión</h4>
                <p className="text-slate-600 leading-relaxed text-sm md:text-base text-justify">
                  Nuestro objetivo es convertirnos en una empresa reconocida en el mercado por la satisfacción del cliente en términos de calidad, costo y tiempo. Nos comprometemos a lograr esto mediante la mejora continua de nuestro personal y el fortalecimiento de nuestras relaciones con socios estratégicos. Enfocados en la excelencia operativa, trabajamos incansablemente para superar las expectativas de nuestros clientes en cada proyecto que emprendemos.
                </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- SERVICIOS --- */}
      <section id="servicios" className="py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            className="mb-20 text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
          >
            <h2 className="text-orange-500 font-bold tracking-wider uppercase text-sm mb-4">Nuestros Servicios</h2>
            <h3 className="text-4xl md:text-5xl font-bold mb-6">Innovación y Progreso</h3>
            <p className="text-slate-300 text-lg leading-relaxed text-justify">
              En Constructora e Inversiones L&K SAC, nuestra misión es mucho más que simplemente completar proyectos; nos esforzamos por ser líderes en la transformación del panorama construido, dejando un legado de innovación y progreso en cada obra que emprendemos. Desde el diseño inicial hasta la entrega final, nuestra dedicación a la excelencia se refleja en cada detalle, asegurando que nuestros clientes reciban soluciones a medida que no solo cumplen, sino que superan sus expectativas. Con un enfoque centrado en la eficiencia y la calidad, nos destacamos en la gestión proactiva de riesgos y en la optimización de recursos, garantizando resultados que perduran en el tiempo y agregan valor a las comunidades que servimos. Nos comprometemos a mantenernos a la vanguardia de las tendencias emergentes y las mejores prácticas de la industria, asegurando que cada proyecto sea una expresión de nuestro compromiso con la excelencia, la innovación y el desarrollo sostenible.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
          >
            {servicesData.map((srv, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:-translate-y-2 transition-all duration-300 group flex flex-col"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={srv.img} 
                    alt={srv.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-60"></div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <h4 className="text-xl font-bold mb-4 group-hover:text-orange-400 transition-colors leading-tight">
                    {srv.title}
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed text-justify flex-1">
                    {srv.desc}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center text-orange-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                    Solicitar información <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="mt-16 text-center">
             <button onClick={() => scrollToSection('contacto')} className="px-8 py-4 bg-orange-600 text-white rounded-full font-bold text-lg hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-500/30">
                Cotizar mi Proyecto Ahora
             </button>
          </div>
        </div>
      </section>

      {/* --- PROYECTOS (SLIDER Y GRID) --- */}
      <section id="proyectos" className="py-32 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="mb-20 text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
          >
            <h2 className="text-orange-600 font-bold tracking-[0.2em] uppercase text-sm mb-4">Portafolio</h2>
            <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Proyectos Ejecutados</h3>
            <p className="text-slate-600 text-lg leading-relaxed text-justify">
              En Constructora e Inversiones L&K SAC nos especializamos en la ejecución de proyectos de construcción de gran envergadura, abarcando desde centros comerciales y supermercados hasta cines, universidades, plantas industriales, bancos, edificios de oficinas y viviendas multifamiliares. Cada proyecto refleja nuestro compromiso con la excelencia en la construcción y la optimización de costos, tiempos, calidad y seguridad, conforme a las exigencias propias del sector.
            </p>
          </motion.div>

          {/* SLIDER */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            className="relative w-full h-[500px] md:h-[600px] rounded-[2.5rem] overflow-hidden shadow-2xl mb-24 group"
          >
            <AnimatePresence mode='wait'>
              <motion.div
                key={currentProjectIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0"
              >
                <img 
                  src={featuredProjects[currentProjectIndex].image} 
                  alt={featuredProjects[currentProjectIndex].title} 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-3/4">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="inline-block px-4 py-1 mb-4 text-xs font-bold text-white bg-orange-600 rounded-full uppercase tracking-wider">
                      Proyecto Destacado
                    </span>
                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                      {featuredProjects[currentProjectIndex].title}
                    </h3>
                    <p className="text-slate-300 text-lg flex items-center gap-2">
                      <MapPin size={20} className="text-orange-500" />
                      {featuredProjects[currentProjectIndex].location}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <button 
              onClick={prevProject}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-4 rounded-full text-white transition-all hover:scale-110 z-20"
            >
              <ChevronLeft size={32} />
            </button>
            <button 
              onClick={nextProject}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-4 rounded-full text-white transition-all hover:scale-110 z-20"
            >
              <ChevronRight size={32} />
            </button>

            <div className="absolute bottom-8 right-8 flex gap-3 z-20">
              {featuredProjects.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    idx === currentProjectIndex ? 'bg-orange-500 w-8' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* GRID DE MÁS PROYECTOS */}
          <div className="text-center mb-12">
            <h4 className="text-2xl font-bold text-slate-800">Más Proyectos Realizados</h4>
            <div className="h-1 w-16 bg-slate-300 mx-auto rounded-full mt-4"></div>
          </div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
          >
            {recentProjects.map((proj, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full"
              >
                <div className="mb-4 bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center text-orange-600">
                  <CheckCircle2 size={24} />
                </div>
                <h5 className="font-bold text-slate-900 text-lg mb-2 leading-tight">
                  {proj}
                </h5>
                <div className="mt-auto pt-4">
                   <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Finalizado</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- CONTACTO --- */}
      <section id="contacto" className="py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl font-bold text-slate-900 mb-8">Hablemos de tu <br/> <span className="text-orange-600">próximo proyecto</span></h2>
              <p className="text-slate-600 mb-12 text-lg leading-relaxed">
                Estamos listos para asesorarte desde el primer paso. Contáctanos por cualquiera de nuestros canales y construyamos algo grandioso.
              </p>

              <div className="space-y-10">
                <ContactItem icon={<PhoneCall size={24} />} title="Llámanos" text="955 735 307 / 992 258 880" subtext="(01) 608 5256" />
                <ContactItem icon={<Mail size={24} />} title="Escríbenos" text="contacto@constructoralyk.com" subtext="Respuesta en menos de 24h" />
                <ContactItem icon={<MapPin size={24} />} title="Visítanos" text="Av. Principal 123, Of. 405" subtext="Lima, Perú" />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-xl"
            >
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">Nombre Completo</label>
                  <input type="text" className="w-full px-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="Ej. Juan Pérez" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">Correo Electrónico</label>
                  <input type="email" className="w-full px-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all" placeholder="Ej. juan@empresa.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800 uppercase tracking-wide">Mensaje</label>
                  <textarea rows="4" className="w-full px-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all resize-none" placeholder="Cuéntanos sobre tu proyecto..."></textarea>
                </div>
                <button className="w-full py-5 bg-orange-600 text-white font-bold text-lg rounded-xl hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1">
                  Enviar Mensaje
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="mb-4 md:mb-0 text-center md:text-left">
               <img src={logo} alt="Logo" className="h-10 grayscale opacity-50 hover:opacity-100 transition-opacity mx-auto md:mx-0 mb-4" />
               <p className="text-sm max-w-xs">Brindando soluciones de ingeniería y construcción con los más altos estándares de calidad.</p>
            </div>
            
            <div className="text-sm flex flex-col md:flex-row gap-6 md:gap-8 items-center flex-wrap justify-center">
              <span className="hover:text-white cursor-pointer transition-colors">Política de Privacidad</span>
              
              {/* BOTÓN LIBRO DE RECLAMACIONES */}
              <button 
                onClick={() => navigate('/libro-reclamaciones')}
                className="hover:text-white hover:scale-105 transition-all flex items-center gap-2 border border-slate-700 px-4 py-2 rounded-full bg-slate-800/50"
              >
                 <BookOpen size={16} className="text-orange-500" /> 
                 <span>Libro de Reclamaciones</span>
              </button>
              
              <span>&copy; {new Date().getFullYear()} Constructora L&K SAC.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Componente auxiliar para ítems de contacto
const ContactItem = ({ icon, title, text, subtext }) => (
  <div className="flex items-start gap-6 group cursor-default">
    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all duration-300 shadow-sm">
      {icon}
    </div>
    <div>
      <h5 className="font-bold text-slate-900 text-lg mb-1">{title}</h5>
      <p className="text-slate-600 font-medium">{text}</p>
      {subtext && <p className="text-slate-400 text-sm mt-1">{subtext}</p>}
    </div>
  </div>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default ClientLandingPage;