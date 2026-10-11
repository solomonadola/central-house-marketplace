import { useSelector } from 'react-redux';
import { useRef, useState, useEffect } from 'react';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from '../firebase';
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  signOutUserStart,
  signOutUserSuccess,
  signOutUserFailure,
} from '../redux/user/userSlice';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaChartBar, FaCog, FaEnvelope, FaFileAlt, FaHandHoldingUsd, FaHeart, FaHistory, FaPlus, FaSignOutAlt, FaTools } from 'react-icons/fa';
import { apiFetch } from '../utils/apiFetch';
export default function Profile() {
  const fileRef = useRef(null);
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [formData, setFormData] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showListingsError, setShowListingsError] = useState(false);
  const [userListings, setUserListings] = useState([]);
  const dispatch = useDispatch();

  // firebase storage
  // allow read;
  // allow write: if
  // request.resource.size < 2 * 1024 * 1024 &&
  // request.resource.contentType.matches('image/.*')

  useEffect(() => {
    if (!file) return;

    const storage = getStorage(app);
    const fileName = new Date().getTime() + file.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFilePerc(Math.round(progress));
      },
      () => {
        setFileUploadError(true);
      },
      () => {
        // Functional update: the user may have edited other fields while
        // the upload was running.
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) =>
          setFormData((prev) => ({ ...prev, avatar: downloadURL }))
        );
      }
    );
  }, [file]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await apiFetch(`/api/user/update/${currentUser._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(updateUserFailure(data.message));
        return;
      }

      dispatch(updateUserSuccess(data));
      setUpdateSuccess(true);
    } catch (error) {
      dispatch(updateUserFailure(error.message));
    }
  };

  const handleDeleteUser = async () => {
    const confirmed = window.confirm(
      'Delete your account? This permanently removes your listings, messages and reviews.'
    );
    if (!confirmed) return;
    try {
      dispatch(deleteUserStart());
      const res = await apiFetch(`/api/user/delete/${currentUser._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success === false) {
        dispatch(deleteUserFailure(data.message));
        return;
      }
      dispatch(deleteUserSuccess(data));
    } catch (error) {
      dispatch(deleteUserFailure(error.message));
    }
  };

  const handleSignOut = async () => {
    try {
      dispatch(signOutUserStart());
      const res = await apiFetch('/api/auth/signout');
      const data = await res.json();
      if (data.success === false) {
        dispatch(signOutUserFailure(data.message));
        return;
      }
      dispatch(signOutUserSuccess());
    } catch (error) {
      dispatch(signOutUserFailure(error.message));
    }
  };

  const [listingsLoaded, setListingsLoaded] = useState(false);

  const handleShowListings = async () => {
    try {
      setShowListingsError(false);
      const res = await apiFetch(`/api/user/listings/${currentUser._id}`);
      const data = await res.json();
      if (data.success === false) {
        setShowListingsError(true);
        return;
      }

      setUserListings(data);
    } catch (error) {
      setShowListingsError(true);
    } finally {
      setListingsLoaded(true);
    }
  };

  // Load the user's listings when the page opens.
  useEffect(() => {
    handleShowListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per user
  }, [currentUser._id]);

  const handleListingDelete = async (listingId) => {
    try {
      const res = await apiFetch(`/api/listing/delete/${listingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success === false) {
        console.log(data.message);
        return;
      }

      setUserListings((prev) =>
        prev.filter((listing) => listing._id !== listingId)
      );
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleToggleActive = async (listing) => {
    try {
      const res = await apiFetch(`/api/listing/${listing._id}/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: listing.active === false }),
      });
      const data = await res.json();
      if (data.success === false) return;
      setUserListings((prev) => prev.map((l) => (l._id === listing._id ? { ...l, active: data.active } : l)));
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleDuplicate = async (listing) => {
    try {
      const res = await apiFetch(`/api/listing/${listing._id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.success === false) return;
      handleShowListings();
    } catch (error) {
      console.log(error.message);
    }
  };
  const quickLinks = [
    [FaChartBar, 'Listing analytics', '/analytics'],
    [FaCalendarAlt, 'Viewings', '/viewings'],
    [FaTools, 'Maintenance', '/maintenance'],
    [FaFileAlt, 'Applications', '/applications'],
    [FaHandHoldingUsd, 'Holding deposits', '/payments'],
    [FaHeart, 'Saved homes', '/saved'],
    [FaHistory, 'Recently viewed', '/recently-viewed'],
    [FaEnvelope, 'Messages', '/messages'],
    [FaCog, 'Notification settings', '/settings'],
  ];

  return (
    <main className='container-page py-8'>
      <h1 className='page-title'>Your account</h1>
      <div className='mt-6 grid gap-6 lg:grid-cols-3'>
        <aside className='flex flex-col gap-6'>
          <div className='card flex flex-col items-center p-6 text-center'>
            <input onChange={(e) => setFile(e.target.files[0])} type='file' ref={fileRef} hidden accept='image/*' />
            <button
              type='button'
              onClick={() => fileRef.current.click()}
              className='group relative rounded-full'
              aria-label='Change profile photo'
            >
              <img
                src={formData.avatar || currentUser.avatar}
                alt='profile'
                className='h-24 w-24 rounded-full object-cover ring-4 ring-slate-100'
              />
              <span className='absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100'>
                Change
              </span>
            </button>
            <p className='mt-1 min-h-[1.25rem] text-xs'>
              {fileUploadError ? (
                <span className='text-red-700'>Upload failed (images must be under 2 MB)</span>
              ) : filePerc > 0 && filePerc < 100 ? (
                <span className='text-slate-600'>{`Uploading ${filePerc}%`}</span>
              ) : filePerc === 100 ? (
                <span className='text-green-700'>Photo uploaded. Save to keep it.</span>
              ) : null}
            </p>
            <p className='mt-2 text-lg font-semibold text-slate-900'>{currentUser.username}</p>
            <p className='text-sm text-slate-500'>{currentUser.email}</p>
            <Link to='/create-listing' className='btn-primary mt-5 w-full'>
              <FaPlus className='h-3 w-3' aria-hidden='true' /> Post a listing
            </Link>
          </div>

          <nav className='card divide-y divide-slate-100' aria-label='Account'>
            {quickLinks.map(([Icon, label, to]) => (
              <Link key={to} to={to} className='flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                <Icon className='h-4 w-4 text-slate-400' aria-hidden='true' />
                {label}
              </Link>
            ))}
            <button
              type='button'
              onClick={handleSignOut}
              className='flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50'
            >
              <FaSignOutAlt className='h-4 w-4 text-slate-400' aria-hidden='true' />
              Sign out
            </button>
          </nav>
        </aside>

        <div className='flex flex-col gap-6 lg:col-span-2'>
          <section className='card p-6' aria-labelledby='details-title'>
            <h2 id='details-title' className='text-lg font-semibold text-slate-900'>
              Account details
            </h2>
            <form onSubmit={handleSubmit} className='mt-4 grid gap-4 sm:grid-cols-2'>
              <div>
                <label htmlFor='username' className='label'>
                  Username
                </label>
                <input type='text' id='username' defaultValue={currentUser.username} className='input' onChange={handleChange} />
              </div>
              <div>
                <label htmlFor='email' className='label'>
                  Email
                </label>
                <input type='email' id='email' defaultValue={currentUser.email} className='input' onChange={handleChange} />
              </div>
              <div className='sm:col-span-2'>
                <label htmlFor='password' className='label'>
                  New password
                </label>
                <input
                  type='password'
                  id='password'
                  autoComplete='new-password'
                  placeholder='Leave blank to keep your current password'
                  className='input'
                  onChange={handleChange}
                />
              </div>
              <div className='flex flex-wrap items-center gap-3 sm:col-span-2'>
                <button disabled={loading} className='btn-primary'>
                  {loading ? 'Saving...' : 'Save changes'}
                </button>
                {updateSuccess && <p className='text-sm text-green-700'>User is updated successfully!</p>}
                {error && <p className='text-sm text-red-700'>{error}</p>}
              </div>
            </form>
          </section>

          <section className='card p-6' aria-labelledby='listings-title'>
            <div className='flex items-center justify-between gap-3'>
              <h2 id='listings-title' className='text-lg font-semibold text-slate-900'>
                Your listings
              </h2>
              <button type='button' onClick={handleShowListings} className='btn-ghost px-2 py-1 text-xs'>
                Refresh
              </button>
            </div>
            {showListingsError && <p className='mt-3 text-sm text-red-700'>Error showing listings</p>}
            {listingsLoaded && !showListingsError && userListings.length === 0 && (
              <p className='mt-3 text-sm text-slate-600'>
                You haven&apos;t posted any listings yet.{' '}
                <Link to='/create-listing' className='font-semibold text-brand-700'>
                  Post your first one
                </Link>
              </p>
            )}
            <ul className='mt-4 divide-y divide-slate-100'>
              {userListings.map((listing) => (
                <li key={listing._id} className='flex items-center gap-4 py-3'>
                  <Link to={`/listing/${listing._id}`} className='shrink-0'>
                    <img src={listing.imageUrls[0]} alt='listing cover' className='h-16 w-20 rounded-lg bg-slate-100 object-cover' />
                  </Link>
                  <Link to={`/listing/${listing._id}`} className='min-w-0 flex-1'>
                    <p className='truncate font-semibold text-slate-800 hover:text-brand-700'>{listing.name}</p>
                    <p className='text-xs text-slate-500'>
                      {listing.views ?? 0} {listing.views === 1 ? 'view' : 'views'}
                    </p>
                    {listing.hidden && (
                      <p className='text-xs font-semibold text-amber-700' title={listing.hiddenReason}>
                        Hidden{listing.hiddenReason ? `: ${listing.hiddenReason}` : ''}
                      </p>
                    )}
                    {listing.active === false && !listing.hidden && (
                      <p className='text-xs font-semibold text-slate-500'>Paused</p>
                    )}
                  </Link>
                  <div className='flex shrink-0 gap-1'>
                    <button
                      type='button'
                      onClick={() => handleToggleActive(listing)}
                      className='btn-ghost px-3 py-1.5 text-xs'
                    >
                      {listing.active === false ? 'Activate' : 'Pause'}
                    </button>
                    <button
                      type='button'
                      onClick={() => handleDuplicate(listing)}
                      className='btn-ghost px-3 py-1.5 text-xs'
                    >
                      Duplicate
                    </button>
                    <Link to={`/update-listing/${listing._id}`} className='btn-secondary px-3 py-1.5 text-xs'>
                      Edit
                    </Link>
                    <button
                      type='button'
                      onClick={() => {
                        if (window.confirm(`Delete "${listing.name}"? This can't be undone.`)) handleListingDelete(listing._id);
                      }}
                      className='btn-ghost px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 hover:text-red-800'
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className='rounded-xl border border-red-200 bg-red-50/50 p-6' aria-labelledby='danger-title'>
            <h2 id='danger-title' className='text-lg font-semibold text-red-800'>
              Delete account
            </h2>
            <p className='mt-1 text-sm text-red-700'>
              Permanently delete your account, your listings, messages and reviews.
            </p>
            <button type='button' onClick={handleDeleteUser} className='btn-danger mt-4'>
              Delete account
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
