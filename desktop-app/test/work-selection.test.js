const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

class FakeOption {
  constructor(text = "", value = "") {
    this.textContent = text;
    this.value = value;
    this.dataset = {};
  }
}

class FakeSelect {
  constructor() {
    this.options = [];
    this.selectedIndex = -1;
    this.disabled = false;
    this.listeners = {};
    this.rebuilds = 0;
  }
  get value() { return this.options[this.selectedIndex]?.value ?? ""; }
  set value(value) { this.selectedIndex = this.options.findIndex((option) => option.value === value); }
  get selectedOptions() { return this.selectedIndex >= 0 ? [this.options[this.selectedIndex]] : []; }
  replaceChildren(...options) { this.rebuilds += 1; this.options = options; this.selectedIndex = options.length ? 0 : -1; }
  appendChild(option) { this.options.push(option); if (this.selectedIndex < 0) this.selectedIndex = 0; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  choose(value) { this.value = value; return this.listeners.change?.(); }
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const nodes = new Map([["projectSelect", new FakeSelect()], ["taskSelect", new FakeSelect()]]);
  const values = new Map([["token", "test-only"]]);
  const localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const state = {
    projects: [{ _id: "p1", projectName: "Tax Preparation", clientName: "KCPA" }, { _id: "p2", projectName: "Audit", clientName: "Renau" }],
    tasks: { p1: [{ _id: "t1", taskName: "TAX 1" }, { _id: "t2", taskName: "TAX 2" }], p2: [{ _id: "t3", taskName: "Audit 1" }] },
    failTasks: false,
    taskUrls: [],
    pending: null,
  };
  const context = vm.createContext({
    console: { ...console, log() {}, trace() {} },
    AbortSignal, Date, Intl, JSON, localStorage, sessionStorage: localStorage,
    setInterval: () => 1, clearInterval() {}, setTimeout, Option: FakeOption,
    document: {
      body: { dataset: { page: "dashboard" } },
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { textContent: "", hidden: false, style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, replaceChildren() {}, appendChild() {} });
        return nodes.get(id);
      },
      createElement: () => ({ dataset: {}, classList: { add() {} }, appendChild() {} }),
      querySelectorAll: () => [], addEventListener() {},
    },
    window: { electronAPI: {}, location: { replace() {} }, addEventListener() {} },
    fetch: async (url) => {
      const json = (body, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });
      if (url.includes("/projects")) return json({ projects: state.projects });
      if (url.includes("/tasks")) {
        state.taskUrls.push(url);
        if (state.pending) await state.pending;
        if (state.failTasks) return json({ message: "boom" }, false);
        const projectId = new URL(url).searchParams.get("project");
        return json({ success: true, tasks: state.tasks[projectId] || [] });
      }
      if (url.includes("/auth/me")) return json({ user: { fullName: "Bhargav Kommanaboina", role: "employee" } });
      return json({ timeLogs: [] });
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"), context);
  return { state, context, project: nodes.get("projectSelect"), task: nodes.get("taskSelect"), run: (source) => vm.runInContext(source, context) };
}

test("selected project and task survive repeated and overlapping background refreshes", async () => {
  const h = harness();
  await h.context.loadProjects();
  await h.project.choose("p1");
  assert.equal(h.task.disabled, false);
  assert.deepEqual(h.task.options.map((option) => option.textContent), ["Select Task", "TAX 1", "TAX 2"]);
  await h.task.choose("t2");

  const projectRebuilds = h.project.rebuilds;
  const taskRebuilds = h.task.rebuilds;
  await Promise.all([h.context.refreshDesktopData(), h.context.refreshDesktopData(), h.context.refreshDesktopData()]);
  await h.context.refreshDesktopData();

  assert.equal(h.project.value, "p1");
  assert.equal(h.task.value, "t2");
  assert.equal(h.run("selectedProjectId + '/' + selectedTaskId"), "p1/t2");
  assert.equal(h.project.rebuilds, projectRebuilds, "unchanged project list must not rebuild the dropdown");
  assert.equal(h.task.rebuilds, taskRebuilds, "unchanged task list must not rebuild the dropdown");
});

test("newly assigned task appears on refresh without losing the selection", async () => {
  const h = harness();
  await h.context.loadProjects();
  await h.project.choose("p1");
  await h.task.choose("t1");
  h.state.tasks.p1.push({ _id: "t9", taskName: "New assignment" });

  await h.context.refreshDesktopData();

  assert.ok(h.task.options.some((option) => option.value === "t9"));
  assert.equal(h.project.value, "p1");
  assert.equal(h.task.value, "t1");
});

test("changing project keeps the new project, clears only the task, and ignores stale task responses", async () => {
  const h = harness();
  await h.context.loadProjects();
  await h.project.choose("p1");
  await h.task.choose("t1");

  let release;
  h.state.pending = new Promise((resolve) => { release = resolve; });
  const staleLoad = h.project.choose("p1");
  await flush();
  h.state.pending = null;
  await h.project.choose("p2");
  release();
  await staleLoad;

  assert.equal(h.project.value, "p2");
  assert.equal(h.run("selectedTaskId"), "");
  assert.deepEqual(h.task.options.map((option) => option.textContent), ["Select Task", "Audit 1"]);
  assert.ok(h.state.taskUrls.every((url) => /project=p[12]&/.test(url)), "tasks are requested by project _id");
});

test("task dropdown shows explicit empty and error states", async () => {
  const h = harness();
  await h.context.loadProjects();

  h.state.tasks.p2 = [];
  await h.project.choose("p2");
  assert.equal(h.task.options[0].textContent, "No tasks available for this project");
  assert.equal(h.task.disabled, true);
  assert.equal(h.project.value, "p2");

  h.state.failTasks = true;
  await h.project.choose("p1");
  assert.equal(h.task.options[0].textContent, "Unable to load tasks");
  assert.equal(h.task.disabled, true);
  assert.equal(h.project.value, "p1");

  await h.project.choose("");
  assert.equal(h.task.options[0].textContent, "Select Task");
  assert.equal(h.task.disabled, true);
});
