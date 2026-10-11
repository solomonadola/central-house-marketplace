import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import About from './pages/About';
import Profile from './pages/Profile';
import Header from './components/Header';
import VerifyEmailBanner from './components/VerifyEmailBanner';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import CreateListing from './pages/CreateListing';
import UpdateListing from './pages/UpdateListing';
import Listing from './pages/Listing';
import Search from './pages/Search';
import Saved from './pages/Saved';
import Messages from './pages/Messages';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Admin from './pages/Admin';
import Viewings from './pages/Viewings';
import Analytics from './pages/Analytics';
import AdminRoute from './components/AdminRoute';

export default function App() {
  return (
    <BrowserRouter>
      {/* Column layout keeps the footer at the bottom on short pages. */}
      <div className='flex min-h-screen flex-col'>
      <Header />
      <VerifyEmailBanner />
      <div className='flex-1'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/sign-in' element={<SignIn />} />
        <Route path='/sign-up' element={<SignUp />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password/:token' element={<ResetPassword />} />
        <Route path='/verify-email/:token' element={<VerifyEmail />} />
        <Route path='/about' element={<About />} />
        <Route path='/search' element={<Search />} />
        <Route path='/listing/:listingId' element={<Listing />} />

        <Route element={<PrivateRoute />}>
          <Route path='/profile' element={<Profile />} />
          <Route path='/saved' element={<Saved />} />
          <Route path='/viewings' element={<Viewings />} />
          <Route path='/analytics' element={<Analytics />} />
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
        </Route>
      </Routes>
      </div>
      <Footer />
      </div>
    </BrowserRouter>
  );
}
