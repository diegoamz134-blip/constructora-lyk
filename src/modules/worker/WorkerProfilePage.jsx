import React, { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import {
  Tabs, Tab, Card, CardBody, Input, Button, Avatar, Select, SelectItem, Chip, Divider, Spacer
} from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, CreditCard, Briefcase, Phone,
  GraduationCap, ShieldAlert, Mail, Pencil, Save, X, Camera, ChevronLeft, AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const WorkerProfilePage = () => {
  const { worker, loading, updateProfile } = useWorkerAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [selectedTab, setSelectedTab] = useState("personal");

  useEffect(() => {
    if (worker) {
      initializeFormData();
    }
  }, [worker]);

  const initializeFormData = () => {
    let firstName = worker.first_name || worker.nombres || '';
    let lastName = worker.last_name || worker.apellidos || '';

    // Intento de rescate si apellidos está vacío pero full_name tiene datos
    if (!lastName && worker.full_name) {
        const parts = worker.full_name.split(' ');
        if (parts.length > 1) {
             // Asumimos simple: Últimas dos palabras son apellidos si hay más de 2 palabras
             if (parts.length > 2) {
                 lastName = parts.slice(-2).join(' ');
                 firstName = parts.slice(0, -2).join(' ');
             } else {
                 lastName = parts[1];
                 firstName = parts[0];
             }
        }
    }

    setFormData({
        first_name: firstName,
        last_name: lastName,
        phone: worker.phone || '',
        email: worker.email || '',
        details: {
            nationality: worker.details?.nationality || 'Peruana',
            gender: worker.details?.gender || 'Masculino',
            marital_status: worker.details?.marital_status || 'Soltero(a)',
            address: {
                street: worker.details?.address?.street || '',
                district: worker.details?.address?.district || '',
                province: worker.details?.address?.province || '',
                department: worker.details?.address?.department || 'Ica',
            },
            sizes: {
                shirt: worker.details?.sizes?.shirt || '',
                pant: worker.details?.sizes?.pant || '',
                shoe: worker.details?.sizes?.shoe || '',
            },
            cuspp: worker.details?.cuspp || '',
            emergency_contacts: worker.details?.emergency_contacts || [{ name: '', phone_cell: '', relationship: '' }],
             education: {
                level: worker.details?.education?.level || '',
                status: worker.details?.education?.status || '',
                institution: worker.details?.education?.institution || ''
            },
        },
        bank_name: worker.bank_name || '',
        bank_account: worker.bank_account || '',
        cci: worker.cci || ''
    });
  };

  const handleChange = (field, value, nestedCategory = null, nestedField = null) => {
    setFormData(prev => {
      if (nestedCategory && nestedField) {
        return {
          ...prev,
          details: {
            ...prev.details,
            [nestedCategory]: { ...prev.details[nestedCategory], [nestedField]: value }
          }
        };
      } else if (nestedCategory) {
        return {
            ...prev,
            details: { ...prev.details, [nestedCategory]: value }
        }
      } else {
        return { ...prev, [field]: value };
      }
    });
  };

  const handleEmergencyChange = (field, value) => {
      setFormData(prev => {
          const newContacts = [...(prev.details.emergency_contacts || [])];
          if(newContacts.length === 0) newContacts.push({});
          newContacts[0] = { ...newContacts[0], [field]: value };
          return {
              ...prev,
              details: { ...prev.details, emergency_contacts: newContacts }
          }
      });
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateProfile(formData);
      if (success) {
        setIsEditing(false);
        Swal.fire({
            icon: 'success',
            title: 'Perfil Actualizado',
            text: 'Tus datos se guardaron correctamente.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
      }
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    initializeFormData();
    setIsEditing(false);
  };

  if (loading || !worker || !formData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003366]"></div>
      </div>
    );
  }

  // --- COMPONENTES INTERNOS PARA ORDENAR EL CÓDIGO ---
  
  const InputField = ({ label, value, onChange, type = "text", icon, disabled = false }) => (
    <div className="w-full">
        {isEditing && !disabled ? (
            <Input
                label={label}
                value={value || ''}
                onValueChange={onChange}
                type={type}
                variant="faded"
                color="primary"
                labelPlacement="outside"
                size="lg"
                startContent={icon ? <span className="text-slate-400">{icon}</span> : null}
                classNames={{ 
                    label: "font-bold text-slate-600 mb-1", 
                    inputWrapper: "bg-white border-slate-300 shadow-sm hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-200" 
                }}
            />
        ) : (
            <div className="group">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">{label}</span>
                <div className={`text-base font-semibold border-b border-transparent py-1 ${disabled ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                    {value || <span className="text-slate-300">--</span>}
                </div>
                {isEditing && disabled && (
                   <span className="text-[10px] text-orange-400 flex items-center gap-1"><AlertTriangle size={10}/> No editable</span>
                )}
            </div>
        )}
    </div>
  );

  const SelectField = ({ label, value, onChange, children }) => (
     <div className="w-full">
        {isEditing ? (
            <Select
                label={label}
                selectedKeys={value ? [value] : []}
                onChange={(e) => onChange(e.target.value)}
                variant="faded"
                color="primary"
                labelPlacement="outside"
                size="lg"
                classNames={{ 
                    label: "font-bold text-slate-600 mb-1", 
                    trigger: "bg-white border-slate-300 shadow-sm" 
                }}
            >
                {children}
            </Select>
        ) : (
            <div>
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 block">{label}</span>
                <div className="text-base font-semibold text-slate-800 py-1">
                    {value || <span className="text-slate-300">--</span>}
                </div>
            </div>
        )}
     </div>
  );

  return (
    // overflow-x-hidden es CRUCIAL para evitar scroll lateral
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden pb-32">
      
      {/* --- HEADER FIJO --- */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
         <div className="flex justify-between items-center px-4 py-3 max-w-lg mx-auto">
             <div className="flex items-center gap-3">
                <Button isIconOnly variant="light" size="sm" onPress={() => navigate(-1)} className="text-slate-500">
                    <ChevronLeft size={24} />
                </Button>
                <h1 className="text-lg font-bold text-slate-800">Mi Perfil</h1>
             </div>
             
             {/* BOTONES DE ACCIÓN */}
             <div>
                {!isEditing ? (
                    <Button 
                        size="sm" 
                        variant="flat" 
                        color="primary" 
                        className="bg-blue-50 text-[#003366] font-bold"
                        startContent={<Pencil size={16} />}
                        onPress={() => setIsEditing(true)}
                    >
                        Editar
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button isIconOnly radius="full" color="danger" variant="flat" onPress={handleCancel}>
                            <X size={20} />
                        </Button>
                        <Button isIconOnly radius="full" className="bg-[#003366] text-white shadow-lg shadow-blue-900/20" onPress={handleSave} isLoading={isSaving}>
                            <Save size={20} />
                        </Button>
                    </div>
                )}
             </div>
         </div>

         {/* --- TABS (PESTAÑAS) FIJAS --- */}
         <div className="w-full overflow-x-auto no-scrollbar border-t border-slate-100 bg-white">
             <div className="max-w-lg mx-auto px-4">
                <Tabs 
                    variant="underlined" 
                    color="primary"
                    selectedKey={selectedTab}
                    onSelectionChange={setSelectedTab}
                    classNames={{
                        tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                        cursor: "w-full bg-[#003366] h-1",
                        tab: "max-w-fit px-2 h-12",
                        tabContent: "group-data-[selected=true]:text-[#003366] font-bold text-slate-500 text-sm"
                    }}
                >
                    <Tab key="personal" title="Personal" />
                    <Tab key="contacto" title="Contacto" />
                    <Tab key="laboral" title="Laboral" />
                    <Tab key="bancario" title="Pagos" />
                    <Tab key="formacion" title="Formación" />
                </Tabs>
             </div>
         </div>
      </div>

      {/* --- CONTENIDO SCROLLEABLE --- */}
      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        
        {/* TARJETA DE RESUMEN (Siempre visible arriba del contenido) */}
        {!isEditing && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-16 bg-gradient-to-b from-slate-100 to-white -z-0"></div>
                <div className="relative z-10">
                    <Avatar 
                        src={worker.avatar_url}
                        name={worker.first_name?.charAt(0)}
                        className="w-24 h-24 text-3xl font-bold bg-[#003366] text-white border-4 border-white shadow-lg mb-3"
                    />
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">
                        {formData.first_name} {formData.last_name}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mb-2">{worker.category}</p>
                    <div className="flex gap-2 justify-center">
                        <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600">
                            {worker.document_number}
                        </Chip>
                        <Chip size="sm" variant="dot" color="success" className="border-0">
                            Activo
                        </Chip>
                    </div>
                </div>
            </motion.div>
        )}

        {/* ÁREA DE FORMULARIOS */}
        <AnimatePresence mode='wait'>
            <motion.div 
                key={selectedTab}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                transition={{ duration: 0.2 }}
                className="pb-10"
            >
                {selectedTab === 'personal' && (
                    <div className="flex flex-col gap-6">
                         <Card className="shadow-sm border border-slate-200 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                    <User size={16}/> Información Básica
                                </h3>
                                
                                <InputField label="Nombres" value={formData.first_name} onChange={(v) => handleChange('first_name', v)} />
                                <InputField label="Apellidos" value={formData.last_name} onChange={(v) => handleChange('last_name', v)} />
                                <InputField label="Fecha Nacimiento" value={worker.birth_date} type="date" disabled={true} />
                                
                                <div className="grid grid-cols-1 gap-5">
                                    <SelectField label="Sexo" value={formData.details.gender} onChange={(v) => handleChange(null, v, 'gender')}>
                                        <SelectItem key="Masculino">Masculino</SelectItem>
                                        <SelectItem key="Femenino">Femenino</SelectItem>
                                    </SelectField>
                                    
                                    <SelectField label="Estado Civil" value={formData.details.marital_status} onChange={(v) => handleChange(null, v, 'marital_status')}>
                                        <SelectItem key="Soltero(a)">Soltero(a)</SelectItem>
                                        <SelectItem key="Casado(a)">Casado(a)</SelectItem>
                                        <SelectItem key="Conviviente">Conviviente</SelectItem>
                                    </SelectField>

                                    <SelectField label="Nacionalidad" value={formData.details.nationality} onChange={(v) => handleChange(null, v, 'nationality')}>
                                        <SelectItem key="Peruana">Peruana</SelectItem>
                                        <SelectItem key="Venezolana">Venezolana</SelectItem>
                                        <SelectItem key="Otra">Otra</SelectItem>
                                    </SelectField>
                                </div>
                             </CardBody>
                         </Card>
                    </div>
                )}

                {selectedTab === 'contacto' && (
                    <div className="flex flex-col gap-6">
                         <Card className="shadow-sm border border-slate-200 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                    <Phone size={16}/> Contacto Directo
                                </h3>
                                <InputField label="Celular" value={formData.phone} onChange={(v) => handleChange('phone', v)} type="tel" icon={<Phone size={16}/>} />
                                <InputField label="Email" value={formData.email} onChange={(v) => handleChange('email', v)} type="email" icon={<Mail size={16}/>} />
                             </CardBody>
                         </Card>

                         <Card className="shadow-sm border border-slate-200 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                    <MapPin size={16}/> Dirección
                                </h3>
                                <InputField label="Dirección / Calle" value={formData.details.address.street} onChange={(v) => handleChange(null, v, 'address', 'street')} />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Distrito" value={formData.details.address.district} onChange={(v) => handleChange(null, v, 'address', 'district')} />
                                    <InputField label="Provincia" value={formData.details.address.province} onChange={(v) => handleChange(null, v, 'address', 'province')} />
                                </div>
                                <InputField label="Departamento" value={formData.details.address.department} onChange={(v) => handleChange(null, v, 'address', 'department')} />
                             </CardBody>
                         </Card>
                    </div>
                )}

                {selectedTab === 'laboral' && (
                    <div className="flex flex-col gap-6">
                         <Card className="shadow-sm border border-slate-200 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                    <Briefcase size={16}/> Contrato
                                </h3>
                                <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-xs text-slate-500">Régimen</span>
                                        <span className="text-sm font-bold text-slate-800">{worker.pension_system}</span>
                                    </div>
                                    {worker.pension_system !== 'ONP' && (
                                        <div className="flex justify-between border-b border-slate-200 pb-2">
                                            <span className="text-xs text-slate-500">CUSPP</span>
                                            <span className="text-sm font-bold text-slate-800">{formData.details.cuspp || '--'}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500">Proyecto</span>
                                        <span className="text-sm font-bold text-[#003366] text-right truncate max-w-[150px]">{worker.project_assigned}</span>
                                    </div>
                                </div>
                             </CardBody>
                         </Card>

                         <Card className="shadow-sm border border-slate-200 rounded-2xl bg-orange-50/20">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-orange-800 uppercase border-b border-orange-100 pb-2 mb-1 flex items-center gap-2">
                                    <ShieldAlert size={16}/> Tallas (EPP)
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <InputField label="Camisa" value={formData.details.sizes.shirt} onChange={(v) => handleChange(null, v, 'sizes', 'shirt')} />
                                    <InputField label="Pantalón" value={formData.details.sizes.pant} onChange={(v) => handleChange(null, v, 'sizes', 'pant')} />
                                    <InputField label="Calzado" value={formData.details.sizes.shoe} onChange={(v) => handleChange(null, v, 'sizes', 'shoe')} />
                                </div>
                             </CardBody>
                         </Card>
                    </div>
                )}

                {selectedTab === 'bancario' && (
                     <div className="flex flex-col gap-6">
                        <Card className="shadow-sm border border-red-100 bg-red-50/20 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-red-700 uppercase border-b border-red-100 pb-2 mb-1 flex items-center gap-2">
                                    <ShieldAlert size={16}/> En caso de Emergencia
                                </h3>
                                <InputField label="Nombre Contacto" value={formData.details.emergency_contacts[0]?.name} onChange={(v) => handleEmergencyChange('name', v)} />
                                <InputField label="Celular" value={formData.details.emergency_contacts[0]?.phone_cell} onChange={(v) => handleEmergencyChange('phone_cell', v)} type="tel"/>
                                <InputField label="Parentesco" value={formData.details.emergency_contacts[0]?.relationship} onChange={(v) => handleEmergencyChange('relationship', v)} />
                             </CardBody>
                         </Card>

                         <Card className="shadow-sm border border-slate-200 rounded-2xl">
                             <CardBody className="p-5 flex flex-col gap-5">
                                <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                    <CreditCard size={16}/> Cuenta Bancaria
                                </h3>
                                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg mb-2">
                                    <p className="text-xs text-yellow-800 flex gap-2">
                                        <AlertTriangle size={14} className="shrink-0"/>
                                        Por seguridad, estos datos no son editables. Contacta a administración para cambios.
                                    </p>
                                </div>
                                <InputField label="Banco" value={formData.bank_name} disabled={true} />
                                <InputField label="Cuenta" value={formData.bank_account} disabled={true} />
                                <InputField label="CCI" value={formData.cci} disabled={true} />
                             </CardBody>
                         </Card>
                     </div>
                )}

                {selectedTab === 'formacion' && (
                     <Card className="shadow-sm border border-slate-200 rounded-2xl">
                         <CardBody className="p-5 flex flex-col gap-5">
                            <h3 className="text-sm font-bold text-[#003366] uppercase border-b border-slate-100 pb-2 mb-1 flex items-center gap-2">
                                <GraduationCap size={16}/> Formación
                            </h3>
                            <SelectField label="Nivel Educativo" value={formData.details.education.level} onChange={(v) => handleChange(null, v, 'education', 'level')}>
                                <SelectItem key="Primaria">Primaria</SelectItem>
                                <SelectItem key="Secundaria">Secundaria</SelectItem>
                                <SelectItem key="Técnico">Técnico</SelectItem>
                                <SelectItem key="Universitario">Universitario</SelectItem>
                            </SelectField>
                            <SelectField label="Estado" value={formData.details.education.status} onChange={(v) => handleChange(null, v, 'education', 'status')}>
                                <SelectItem key="Incompleto">Incompleto</SelectItem>
                                <SelectItem key="Completo">Completo</SelectItem>
                                <SelectItem key="En Curso">En Curso</SelectItem>
                            </SelectField>
                            <InputField label="Institución / Carrera" value={formData.details.education.institution} onChange={(v) => handleChange(null, v, 'education', 'institution')} />
                         </CardBody>
                     </Card>
                )}

            </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
};

export default WorkerProfilePage;