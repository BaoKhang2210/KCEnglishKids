const mongoose = require('mongoose');
const rules = require('../../../shared/learningGames.json');
const schema = new mongoose.Schema({
  key: { type: String, enum: ['STAGE3'], default: 'STAGE3', unique: true },
  games: [{ _id: false, gameId: { type: String, enum: rules.map(rule => rule.id), required: true }, enabled: { type: Boolean, required: true }, displayOrder: { type: Number, required: true, min: 0 } }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, optimisticConcurrency: true });
module.exports = mongoose.model('GameCatalogSetting', schema);
