import { Navigate, Outlet } from 'react-router-dom'
import { usePerfil } from '@/hooks/usePerfil'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminRoute() {
  const { data: perfil, isLoading } = usePerfil()

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" style={{ marginTop: '1rem' }} />
      </div>
    )
  }

  const isAdmin = perfil?.rol === 'admin' && perfil.activo !== false

  if (!isAdmin) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
