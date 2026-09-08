const SystemSettings = require("../models/SystemSettings");

const { defaults, normalizeIdlePolicy, validateIdlePolicy } = require("../utils/idlePolicy");

const getSettings = () =>
  SystemSettings.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { idleThresholdMinutes: defaults.idleThresholdMinutes, autoLogoutMinutes: defaults.autoLogoutMinutes } },
    { new: true, upsert: true, runValidators: true }
  );

const getIdlePolicy = async (req, res) => {
  try {
    const settings = await getSettings();

    return res.status(200).json({
      success: true,
      idlePolicy: {
        ...normalizeIdlePolicy(settings),
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
    const existing = await getSettings();
    const policy = {
      idleThresholdMinutes,
      autoLogoutMinutes: req.body.autoLogoutMinutes === undefined
        ? Math.max(normalizeIdlePolicy(existing).autoLogoutMinutes, idleThresholdMinutes + 1)
        : Number(req.body.autoLogoutMinutes),
    };
    const validationError = validateIdlePolicy(policy);

    if (
      validationError
    ) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const settings = await SystemSettings.findOneAndUpdate(
      { key: "global" },
      { $set: policy },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Idle settings saved successfully.",
      idlePolicy: {
        ...normalizeIdlePolicy(settings),
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
