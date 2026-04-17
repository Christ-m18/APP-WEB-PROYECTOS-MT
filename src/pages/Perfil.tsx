import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePerfil, useUpsertPerfil } from '@/hooks/usePerfil'
import { perfilSchema, type PerfilFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { User, Shield, LogOut, Building, Phone, Mail, Activity, Check, Pencil, X, Save } from 'lucide-react'
import styles from './Perfil.module.css'

export default function Perfil() {
  const navigate = useNavigate()
  const { data: perfil, isLoading } = usePerfil()
  const upsertMutation = useUpsertPerfil()
  const [initials, setInitials] = useState('??')
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilFormData>({ 
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      empresa: '',
      telefono: ''
    }
  })

  useEffect(() => {
    const loadAuthData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (user) {
        const meta = user.user_metadata || {}
        reset({
          nombre: perfil?.nombre || meta.nombre || '',
          apellido: perfil?.apellido || meta.apellido || '',
          empresa: perfil?.empresa || meta.empresa || '',
          telefono: perfil?.telefono || meta.telefono || '',
        })
        
        const n = (perfil?.nombre || meta.nombre || '?')[0]
        const a = (perfil?.apellido || meta.apellido || '')[0] || ''
        setInitials((n + a).toUpperCase())
      }
    }
    void loadAuthData()
  }, [perfil, reset])

  const onSubmit = (data: PerfilFormData) => {
    upsertMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Perfil actualizado correctamente' })
        const n = (data.nombre || '?')[0]
        const a = (data.apellido || '')[0] || ''
        setInitials((n + a).toUpperCase())
        setIsEditing(false)
      },
      onError: (e) =>
        toast({ title: 'Error al actualizar', description: String(e), variant: 'destructive' }),
    })
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({ title: 'Error al cerrar sesión', description: error.message, variant: 'destructive' })
    } else {
      void navigate('/')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-8 animate-pulse">
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Skeleton className="h-24 w-24 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page + " animate-in fade-in duration-500"}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarLarge}>{initials}</div>
        <div className={styles.headerInfo}>
          <h2>{perfil?.nombre || 'Usuario'} {perfil?.apellido || 'Activo'}</h2>
          <p className={styles.email}><Mail size={16} className="inline mr-2" />{perfil?.email}</p>
          <div className={styles.badges}>
            <span className={styles.rolBadge}>
              <Shield size={14} className="inline mr-1" />
              {perfil?.rol || 'USUARIO'}
            </span>
            <span className={styles.statusBadge}>
              <Check size={14} className="inline mr-1" />
              Cuenta Verificada
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.sectionIcon}><User size={20} /></div>
                  <h3 className={styles.sectionTitle}>Datos del Perfil</h3>
                </div>
                <button 
                  type="button" 
                  className={styles.btnToggleEdit}
                  onClick={() => setIsEditing(!isEditing)}
                  title={isEditing ? "Cancelar edición" : "Editar perfil"}
                >
                  {isEditing ? <X size={18} /> : <Pencil size={18} />}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className={styles.field}>
                  <label>Nombre Completo</label>
                  <Input {...register('nombre')} readOnly={!isEditing} placeholder="Tu nombre" className={!isEditing ? styles.inputReadOnly : ''} />
                  {errors.nombre && <span className="text-red-500 text-xs font-bold mt-1">{errors.nombre.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Primer Apellido</label>
                  <Input {...register('apellido')} readOnly={!isEditing} placeholder="Tu apellido" className={!isEditing ? styles.inputReadOnly : ''} />
                  {errors.apellido && <span className="text-red-500 text-xs font-bold mt-1">{errors.apellido.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Organización / Institución</label>
                  <div style={{ position: 'relative' }}>
                    <Building size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <Input {...register('empresa')} readOnly={!isEditing} placeholder="ej. Energía del Norte" style={{ paddingLeft: '3rem' }} className={!isEditing ? styles.inputReadOnly : ''} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Línea Telefónica</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <Input type="tel" {...register('telefono')} readOnly={!isEditing} placeholder="809-000-0000" style={{ paddingLeft: '3rem' }} className={!isEditing ? styles.inputReadOnly : ''} />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: '2.5rem' }}>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting || !isDirty}
                    style={{ 
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                      fontWeight: 800,
                      height: '3.2rem',
                      fontSize: '0.95rem'
                    }}
                  >
                    <Save size={18} className="mr-2" /> {isSubmitting ? 'SINCRONIZANDO...' : 'ACTUALIZAR INFORMACIÓN'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </section>

        <section className="space-y-8">
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={styles.sectionIcon} style={{ background: '#ecfdf5', color: '#10b981' }}><Activity size={20} /></div>
                <h3 className={styles.sectionTitle}>Estado de la Cuenta</h3>
              </div>
            </div>
            
            <div className={styles.statusBox}>
              <div className={styles.statusItem}>
                <span>LATENCIA DEL SERVIDOR</span>
                <span className={styles.statusValue}>12ms — Excelente</span>
              </div>
              <div className={styles.statusItem}>
                <span>PROTOCOLO DE SEGURIDAD</span>
                <span className={styles.statusValue}>TLS 1.3 — Encriptado</span>
              </div>
              <div className={styles.statusItem}>
                <span>ÚLTIMA SINCRONIZACIÓN</span>
                <span className={styles.statusValue}>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6, fontWeight: 500 }}>
              Tu sesión está protegida por encriptación de grado bancario. Para garantizar la seguridad de tus datos, recuerda cerrar sesión si accedes desde un equipo compartido.
            </p>
            
            <button 
              className={styles.btnLogoutModern}
              onClick={handleLogout}
            >
              <LogOut size={20} /> CERRAR SESIÓN DE FORMA SEGURA
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
