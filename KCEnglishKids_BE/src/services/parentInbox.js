const { ParentNotification } = require('../models');

/** Stable sources prevent duplicate reports. A review projection never overwrites a newer revision. */
async function publish(values) {
  if (!values.sourceKey) return ParentNotification.create(values);
  const filter = { sourceKey: values.sourceKey };
  if (values.sourceRevision !== undefined) filter.$or = [
    { sourceRevision: { $lte: values.sourceRevision } },
    { sourceRevision: { $exists: false } }
  ];
  try {
    return await ParentNotification.findOneAndUpdate(filter, { $set: values }, { upsert: true, new: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Another request created the source, or its newer revision no longer matches this update.
    const updated = await ParentNotification.findOneAndUpdate(filter, { $set: values }, { new: true, runValidators: true });
    return updated || ParentNotification.findOne({ sourceKey: values.sourceKey });
  }
}
module.exports = { publish };
