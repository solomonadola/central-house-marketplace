import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

// The server enforces admin access; this only keeps others off the page.
export default function AdminRoute() {
  const { currentUser } = useSelector((state) => state.user);
  if (!currentUser) return <Navigate to='/sign-in' />;
  return currentUser.role === 'admin' ? <Outlet /> : <Navigate to='/' />;
}
