import React, { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { PlatformPermission } from '../../tenants/types/platform.types';
import { Button } from '../../../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../../../store';
import { fetchAuthorizationBootstrap } from '../../../../store/slices/authorizationSlice';

interface PlatformAccessGuardProps {
  children?: React.ReactNode;
  requiredPermission?: PlatformPermission;
}

export function PlatformAccessGuard({
  children,
  requiredPermission = 'platform.dashboard.view',
}: PlatformAccessGuardProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { platform, loaded, loading } = useAppSelector((state) => state.authorization);

  useEffect(() => {
    if (isAuthenticated && !loaded && !loading) {
      dispatch(fetchAuthorizationBootstrap());
    }
  }, [isAuthenticated, loaded, loading, dispatch]);

  const hasAccess = loaded && platform?.permissions?.includes(requiredPermission);

  if (loading || (!loaded && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[#F3F5F7] flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0D1F3D] border-t-transparent mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Verifying platform permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#F3F5F7] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-sm border border-slate-200 bg-white p-8 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0D1F3D]">Access Restricted</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              You do not have permission to access the Smart Field Work Platform Console or this specific resource ({requiredPermission}).
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
              className="gap-2 font-bold text-slate-700 w-full justify-center"
            >
              <ArrowLeft className="h-4 w-4" /> Go to Workspace Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
