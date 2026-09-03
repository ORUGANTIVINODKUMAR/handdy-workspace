const Project = require("../models/Project");
const Client = require("../models/Client");
const { escapeRegExp, getPagination } = require("../utils/requestUtils");
const { SERVICE_TYPES } = require("../utils/serviceRates");

const handleProjectError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "Project code already exists." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: "Unable to process the project request." });
};

const generateProjectCode = async () => {
  let projectCode;
  do {
    projectCode = `PRJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  } while (await Project.exists({ projectCode }));
  return projectCode;
};

const normalizeClientIds = (value) => [...new Set((Array.isArray(value) ? value : value ? [value] : [])
  .map(String)
  .filter(Boolean))];

const resolveProjectClients = async (value) => {
  const ids = normalizeClientIds(value);
  if (!ids.length) return { error: "Select at least one active client." };
  const clients = await Client.find({ _id: { $in: ids }, status: "Active" }).select("clientName");
  return clients.length === ids.length
    ? { clients, ids }
    : { error: "One or more selected clients are invalid or inactive." };
};

// Create Project
const createProject = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!SERVICE_TYPES.includes(payload.serviceType)) {
      return res.status(400).json({ success: false, message: "Select a valid Service Type." });
    }
    payload.projectCode = payload.projectCode?.trim() || await generateProjectCode();
    const clientResolution = await resolveProjectClients(payload.clients || payload.client);
    if (clientResolution.error) return res.status(400).json({ success: false, message: clientResolution.error });
    payload.clients = clientResolution.ids;
    payload.client = clientResolution.ids[0];
    payload.clientName = clientResolution.clients.map((client) => client.clientName).join(", ");
    const project = await Project.create({
      ...payload,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project,
    });
  } catch (error) {
    return handleProjectError(res, error);
  }
};

// Get All Projects
const getAllProjects = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const search = req.query.search || "";
    const status = req.query.status || "";

    const filter = {};

    if (search) {
      const safeSearch = escapeRegExp(search);
      filter.$or = [
        { projectCode: { $regex: safeSearch, $options: "i" } },
        { projectName: { $regex: safeSearch, $options: "i" } },
        { clientName: { $regex: safeSearch, $options: "i" } },
        { serviceType: { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const totalProjects = await Project.countDocuments(filter);

    const projects = await Project.find(filter)
      .populate("createdBy", "fullName email")
      .populate("client", "clientName status")
      .populate("clients", "clientName status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(totalProjects / limit),
      count: projects.length,
      totalProjects,
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Project By ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("createdBy", "fullName email")
      .populate("client", "clientName status")
      .populate("clients", "clientName status");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Project
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const updates = { ...req.body };
    if (updates.serviceType !== undefined && !SERVICE_TYPES.includes(updates.serviceType)) {
      return res.status(400).json({ success: false, message: "Select a valid Service Type." });
    }
    if (updates.clients !== undefined || updates.client !== undefined) {
      const clientResolution = await resolveProjectClients(updates.clients || updates.client);
      if (clientResolution.error) return res.status(400).json({ success: false, message: clientResolution.error });
      updates.clients = clientResolution.ids;
      updates.client = clientResolution.ids[0];
      updates.clientName = clientResolution.clients.map((client) => client.clientName).join(", ");
    }
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Project updated successfully.",
      project: updatedProject,
    });
  } catch (error) {
    return handleProjectError(res, error);
  }
};

// Delete Project
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    project.status = "Completed";
    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project archived successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
