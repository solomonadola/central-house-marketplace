import SavedSearch from '../models/savedSearch.model.js';
import { errorHandler } from '../utils/error.js';

const FILTER_KEYS = [
  'searchTerm',
  'type',
  'parking',
  'furnished',
  'offer',
  'propertyType',
  'amenities',
  'minPrice',
  'maxPrice',
  'minBedrooms',
  'minBathrooms',
];

const pickFilters = (body) =>
  Object.fromEntries(FILTER_KEYS.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

export const createSavedSearch = async (req, res, next) => {
  try {
    const savedSearch = await SavedSearch.create({
      user: req.user.id,
      name: req.body.name ?? '',
      filters: pickFilters(req.body),
    });
    res.status(201).json(savedSearch);
  } catch (error) {
    next(error);
  }
};

export const listSavedSearches = async (req, res, next) => {
  try {
    const searches = await SavedSearch.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json(searches);
  } catch (error) {
    next(error);
  }
};

export const updateSavedSearch = async (req, res, next) => {
  try {
    const update = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.alertsEnabled !== undefined) update.alertsEnabled = req.body.alertsEnabled;

    const savedSearch = await SavedSearch.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!savedSearch) return next(errorHandler(404, 'Saved search not found!'));
    res.status(200).json(savedSearch);
  } catch (error) {
    next(error);
  }
};

export const deleteSavedSearch = async (req, res, next) => {
  try {
    const savedSearch = await SavedSearch.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!savedSearch) return next(errorHandler(404, 'Saved search not found!'));
    res.status(200).json('Saved search deleted!');
  } catch (error) {
    next(error);
  }
};
