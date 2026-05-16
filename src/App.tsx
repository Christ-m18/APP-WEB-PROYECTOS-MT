import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/toast'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Registro = lazy(() => import('@/pages/Registro'))
const ConfirmarCorreo = lazy(() => import('@/pages/ConfirmarCorreo'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const NuevoPresupuesto = lazy(() => import('@/pages/NuevoPresupuesto'))
const Proyectos = lazy(() => import('@/pages/Proyectos'))
const Resoluciones = lazy(() => import('@/pages/Resoluciones'))
const Perfil = lazy(() => import('@/pages/Perfil'))
const Suscripcion = lazy(() => import('@/pages/Suscripcion'))
const AdminPanel = lazy(() => import('@/pages/AdminPanel'))
const AdminRoute = lazy(() => import('@/components/auth/AdminRoute'))

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/confirmar-correo" element={<ConfirmarCorreo />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Rutas de la app (con layout sidebar) */}
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="presupuesto/nuevo" element={<NuevoPresupuesto />} />
          <Route path="presupuesto/:id" element={<NuevoPresupuesto />} />
          <Route path="proyectos" element={<Proyectos />} />
          <Route path="resoluciones" element={<Resoluciones />} />
          <Route path="suscripcion" element={<Suscripcion />} />
          <Route path="perfil" element={<Perfil />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    <Toaster />
    </>
  )
}
