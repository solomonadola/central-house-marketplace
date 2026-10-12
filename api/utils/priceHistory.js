import PriceChange from '../models/priceChange.model.js';
import User from '../models/user.model.js';
import { notifyPriceDrop } from './notifications.js';

// What a buyer pays right now.
export const effectivePrice = (listing) =>
  listing.offer ? Number(listing.discountPrice) : Number(listing.regularPrice);

// Records the price a listing was first posted at. Never throws: a failure
// here must not undo a listing that was created successfully.
export const recordInitialPrice = async (listing) => {
  try {
    await PriceChange.create({
      listing: listing._id,
      price: effectivePrice(listing),
      regularPrice: listing.regularPrice,
      offer: listing.offer,
    });
  } catch (error) {
    console.error('Failed to record initial price:', error.message);
  }
};

// Compares a listing before and after an update. When the effective price
// changed it is recorded, and when it went down everyone who saved the
// listing hears about it. Never throws.
export const recordPriceChange = async (before, after) => {
  try {
    const oldPrice = effectivePrice(before);
    const newPrice = effectivePrice(after);
    if (oldPrice === newPrice) return null;

    const change = await PriceChange.create({
      listing: after._id,
      price: newPrice,
      previousPrice: oldPrice,
      regularPrice: after.regularPrice,
      offer: after.offer,
    });

    // Hidden or paused listings shouldn't send people to a page they can't see.
    if (newPrice < oldPrice && !after.hidden && after.active !== false) {
      const fans = await User.find({ favorites: after._id, _id: { $ne: after.userRef } }, '_id');
      await Promise.all(
        fans.map((fan) =>
          notifyPriceDrop({
            recipient: fan._id,
            listingId: after._id,
            listingName: after.name,
            oldPrice,
            newPrice,
            perMonth: after.type === 'rent',
          })
        )
      );
    }
    return change;
  } catch (error) {
    console.error('Failed to record price change:', error.message);
    return null;
  }
};

// Percentage drop from the highest price to the current one, rounded to a
// whole number, or 0 if the price never dropped.
export const dropFromPeak = (history) => {
  if (history.length === 0) return 0;
  const peak = Math.max(...history.map((h) => h.price));
  const current = history[0].price;
  return peak > current ? Math.round(((peak - current) / peak) * 100) : 0;
};
