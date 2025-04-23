import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/components/auth/AuthContext';

interface AdminOnlyProps {
  children: ReactNode;
}

const AdminOnly: React.FC<AdminOnlyProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Show nothing while checking auth status
  if (isLoading) {
    return null;
  }

  // Redirect if not logged in or not admin
  if (!user || user.user_metadata.role !== 'admin') {
    // Redirect happens in useEffect in the admin page
    return null;
  }

  // If user is admin, render children
  return <>{children}</>;
};

export default AdminOnly;