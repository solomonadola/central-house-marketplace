import Lease from '../models/lease.model.js';
import RentCharge from '../models/rentCharge.model.js';
import Inspection from '../models/inspection.model.js';

// Deletes the leases matching the filter together with their rent charges
// and inspection reports, e.g. when a listing or an account is deleted.
export const removeLeases = async (filter) => {
  const ids = await Lease.find(filter).distinct('_id');
  if (ids.length === 0) return;
  await Promise.all([
    RentCharge.deleteMany({ lease: { $in: ids } }),
    Inspection.deleteMany({ lease: { $in: ids } }),
    Lease.deleteMany({ _id: { $in: ids } }),
  ]);
};
