import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatShortPrice } from '../utils/formatPrice';

// A price tag marker; also avoids Leaflet's default icon images, whose
// URLs break when bundled.
const priceIcon = (listing) =>
  L.divIcon({
    className: '',
    html: `<span class="listing-price-marker">${formatShortPrice(listing)}</span>`,
    iconSize: null,
  });

// Fits the view to the markers whenever the set of listings changes.
function FitBounds({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join(';');

  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures points
  }, [map, key]);

  return null;
}

export default function ListingsMap({ listings, className = 'h-[400px]' }) {
  const located = listings.filter((l) => l.location);
  if (located.length === 0) return null;

  const points = located.map((l) => [l.location.lat, l.location.lng]);

  return (
    <MapContainer center={points[0]} zoom={13} scrollWheelZoom={false} className={`w-full rounded-lg z-0 ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      <FitBounds points={points} />
      {located.map((listing) => (
        <Marker key={listing._id} position={[listing.location.lat, listing.location.lng]} icon={priceIcon(listing)}>
          <Popup>
            <Link to={`/listing/${listing._id}`} className='font-semibold text-slate-700 hover:underline'>
              {listing.name}
            </Link>
            <br />
            {listing.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
