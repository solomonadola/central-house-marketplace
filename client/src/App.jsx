import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import About from './pages/About';
import Profile from './pages/Profile';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import VerifyEmailBanner from './components/VerifyEmailBanner';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import CreateListing from './pages/CreateListing';
import UpdateListing from './pages/UpdateListing';
import Listing from './pages/Listing';
import Search from './pages/Search';
import Saved from './pages/Saved';
import SavedSearches from './pages/SavedSearches';
import Compare from './pages/Compare';
import CompareBar from './components/CompareBar';
import OwnerProfile from './pages/OwnerProfile';
import RecentlyViewed from './pages/RecentlyViewed';
import Insights from './pages/Insights';
import Help from './pages/Help';
import Messages from './pages/Messages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Admin from './pages/Admin';
import Viewings from './pages/Viewings';
import Applications from './pages/Applications';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminRoute from './components/AdminRoute';
import OpenHousesPage from './pages/OpenHousesPage';
import Maintenance from './pages/Maintenance';
import MaintenanceDetail from './pages/MaintenanceDetail';
import Rent from './pages/Rent';
import LeaseDetail from './pages/LeaseDetail';
import NotFound from './pages/NotFound';
import AdminUserDetail from './components/admin/AdminUserDetail';

export default function App() {
  return (
    <BrowserRouter>
      {/* Column layout keeps the footer at the bottom on short pages. */}
      <div className='flex min-h-screen flex-col'>
      <Header />
      <VerifyEmailBanner />
      <div className='flex-1'>
      <ErrorBoundary>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password/:token' element={<ResetPassword />} />
        <Route path='/verify-email/:token' element={<VerifyEmail />} />
        <Route path='/about' element={<About />} />
        <Route path='/search' element={<Search />} />
        <Route path='/open-houses' element={<OpenHousesPage />} />
        <Route path='/compare' element={<Compare />} />
        <Route path='/owner/:ownerId' element={<OwnerProfile />} />
        <Route path='/recently-viewed' element={<RecentlyViewed />} />
        <Route path='/insights' element={<Insights />} />
        <Route path='/help' element={<Help />} />
        <Route path='/listing/:listingId' element={<Listing />} />

        <Route element={<PrivateRoute />}>
          <Route path='/profile' element={<Profile />} />
          <Route path='/saved' element={<Saved />} />
          <Route path='/saved-searches' element={<SavedSearches />} />
          <Route path='/viewings' element={<Viewings />} />
          <Route path='/maintenance' element={<Maintenance />} />
          <Route path='/maintenance/:requestId' element={<MaintenanceDetail />} />
          <Route path='/rent' element={<Rent />} />
          <Route path='/leases/:leaseId' element={<LeaseDetail />} />
          <Route path='/applications' element={<Applications />} />
          <Route path='/payments' element={<Payments />} />
          <Route path='/settings' element={<Settings />} />
          <Route path='/analytics' element={<Analytics />} />
          <Route path='/notifications' element={<Notifications />} />
          <Route path='/messages' element={<Messages />} />
          <Route path='/messages/:conversationId' element={<Messages />} />
          <Route path='/create-listing' element={<CreateListing />} />
          <Route
            path='/update-listing/:listingId'
            element={<UpdateListing />}
          />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path='/admin' element={<Admin />} />
          <Route path='/admin/user/:userId' element={<AdminUserDetail />} />
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
      </div>
      <CompareBar />
      <Footer />
      </div>
    </BrowserRouter>
  );
}
