import { AMENITY_OPTIONS } from '../utils/listingDetails';

// A checkbox grid for a listing's amenities. Value is an array of amenity
// ids; onChange receives the next array.
export default function AmenitiesPicker({ value = [], onChange, disabled = false }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((existing) => existing !== id) : [...value, id]);
  };

  return (
    <fieldset className='rounded-lg border border-gray-300 p-3'>
      <legend className='px-1 text-sm font-medium text-slate-600'>Amenities</legend>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
        {AMENITY_OPTIONS.map(([id, label]) => (
          <label key={id} className='flex items-center gap-2 text-sm text-slate-700'>
            <input
              type='checkbox'
              checked={value.includes(id)}
              disabled={disabled}
              onChange={() => toggle(id)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
