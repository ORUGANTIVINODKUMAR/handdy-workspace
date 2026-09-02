const SystemSettings = require("../models/SystemSettings");

const DEFAULT_IDLE_THRESHOLD_MINUTES = 5;

const getSettings = () =>
  SystemSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { idleThresholdMinutes: DEFAULT_IDLE_THRESHOLD_MINUTES } },
    { new: true, upsert: true, runValidators: true }
  );

const getIdlePolicy = async (req, res) => {
  try {
    const settings = await getSettings();

    return res.status(200).json({
      success: true,
      idlePolicy: {
        idleThresholdMinutes: settings.idleThresholdMinutes,
        idleTrackingExempt: Boolean(req.user.idleTrackingExempt),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load idle settings.",
    });
  }
};

const updateIdlePolicy = async (req, res) => {
  try {
    const idleThresholdMinutes = Number(req.body.idleThresholdMinutes);

    if (
      !Number.isInteger(idleThresholdMinutes) ||
      idleThresholdMinutes < 1 ||
      idleThresholdMinutes > 240
    ) {
      return res.status(400).json({
        success: false,
        message: "Idle threshold must be a whole number from 1 to 240 minutes.",
      });
    }

    const settings = await SystemSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { idleThresholdMinutes } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Idle settings saved successfully.",
      idlePolicy: {
        idleThresholdMinutes: settings.idleThresholdMinutes,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to save idle settings.",
    });
  }
};

module.exports = {
  getIdlePolicy,
  updateIdlePolicy,
};

