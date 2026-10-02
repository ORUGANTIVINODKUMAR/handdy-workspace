import test from "node:test";
import assert from "node:assert/strict";
import { projectServesTeam } from "../src/utils/timeLogReportHelpers.js";

test("team filter keeps the team's projects and unrestricted legacy projects", () => {
  const populated = { teams: [{ _id: "team-a", teamName: "A" }, { _id: "team-b", teamName: "B" }] };
  assert.equal(projectServesTeam(populated, "team-a"), true);
  assert.equal(projectServesTeam(populated, "team-c"), false);
  assert.equal(projectServesTeam({ teams: ["team-a"] }, "team-a"), true);
  assert.equal(projectServesTeam({ teams: [] }, "team-c"), true);
  assert.equal(projectServesTeam({}, "team-c"), true);
  assert.equal(projectServesTeam(populated, ""), true);
});
