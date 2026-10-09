import { useState } from "react";
import { Trash2 } from "lucide-react";
import ModalFrame from "../layout/ModalFrame";
import { deleteManualEntry } from "../../api/manualEntryApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { formatReportDateTime, formatReportDuration } from "../../utils/reportFormatting";
import "../../styles/addEntryModal.css";

export default function ManualEntriesModal({ employee, records, onClose, onDeleted }) {
  const [confirmId, setConfirmId] = useState("");
  const [deleting, setDeleting] = useState("");
  const [deletedIds, setDeletedIds] = useState([]);
  const [error, setError] = useState("");
  const entries = records.filter((record) => record.entrySource === "manual" && !record.manualEntry?.deletedAt
    && String(record.employee?._id || record.employee || "") === String(employee.id)
    && !deletedIds.includes(String(record._id)));
  const remove = async (id) => {
    setDeleting(id);
    setError("");
    try {
      await deleteManualEntry(id);
      setDeletedIds((previous) => [...previous, String(id)]);
      setConfirmId("");
      onDeleted?.(id);
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Unable to delete this manual entry."));
    } finally {
      setDeleting("");
    }
  };
  return <ModalFrame onClose={deleting ? undefined : onClose} label="Manual timesheet entries">
    <div className="employee-modal add-entry-modal">
      <div className="employee-modal-header">
        <div><p className="admin-eyebrow">MANUAL TIMESHEET ENTRIES</p><h2>Entries for {employee.name}</h2>
          <p className="add-entry-subtitle">Manual entries in the current report. Deleting an entry removes its hours from timesheets and billing.</p></div>
        <button type="button" className="modal-close-button" onClick={onClose} disabled={Boolean(deleting)} aria-label="Close">×</button>
      </div>
      {error && <p className="add-entry-alert" role="alert">{error}</p>}
      {entries.length === 0 && <p>No manual entries in this report.</p>}
      <div className="manual-entry-list">{entries.map((entry) => <article className="manual-entry-item" key={entry._id}>
        <strong>{entry.project?.projectName || "Project"} · {entry.task?.taskName || "Task"}</strong>
        <p>{formatReportDateTime(entry.startedAt)} – {formatReportDateTime(entry.stoppedAt)}</p>
        <p>{formatReportDuration(entry.totalWorkedSeconds)} · {entry.manualEntry?.reason || entry.note}</p>
        {confirmId === String(entry._id) ? <div className="manual-entry-confirm" role="group" aria-label="Confirm deletion">
          <span>Delete this manual entry?</span>
          <button type="button" className="secondary-button" onClick={() => setConfirmId("")} disabled={Boolean(deleting)}>Cancel</button>
          <button type="button" className="manual-entry-delete" onClick={() => remove(entry._id)} disabled={Boolean(deleting)}>{deleting ? "Deleting…" : "Confirm delete"}</button>
        </div> : <button type="button" className="manual-entry-delete" onClick={() => { setError(""); setConfirmId(String(entry._id)); }} disabled={Boolean(deleting)}>
          <Trash2 size={14} />Delete entry
        </button>}
      </article>)}</div>
    </div>
  </ModalFrame>;
}
