import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import "../../styles/adminShifts.css";
import axiosInstance from "../../api/axiosInstance";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

// =============================================
// CALCULATE MINUTES BETWEEN TWO TIMES
// Supports overnight shifts like 10 PM - 6 AM
// =============================================
function minutesBetween(start, end) {
    if (!start || !end) {
        return 0;
    }

    const [startHour, startMinute] = start
        .split(":")
        .map(Number);

    const [endHour, endMinute] = end
        .split(":")
        .map(Number);

    let startTotal =
        startHour * 60 + startMinute;

    let endTotal =
        endHour * 60 + endMinute;

    // Overnight shift
    if (endTotal < startTotal) {
        endTotal += 24 * 60;
    }

    return Math.max(
        endTotal - startTotal,
        0
    );
}

// =============================================
// FORMAT MINUTES -> HH:MM
// =============================================
function formatDuration(minutes) {
    const safeMinutes = Math.max(
        Number(minutes) || 0,
        0
    );

    const hours = Math.floor(
        safeMinutes / 60
    );

    const mins =
        safeMinutes % 60;

    return `${String(hours).padStart(
        2,
        "0"
    )}:${String(mins).padStart(2, "0")}`;
}

function AdminAddShift() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        timezone: "",
        shiftType: "Fixed",
        startTime: "",
        endTime: "",
        breakType: "Fixed",
        status: "Active",
    });

    const [breaks, setBreaks] = useState(() => [
        {
            id: "initial-break",
            title: "",
            startTime: "",
            endTime: "",
        },
    ]);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    // =============================================
    // SHIFT DURATION
    // =============================================
    const shiftMinutes = useMemo(() => {
        return minutesBetween(
            form.startTime,
            form.endTime
        );
    }, [
        form.startTime,
        form.endTime,
    ]);

    // =============================================
    // TOTAL BREAK DURATION
    // =============================================
    const breakMinutes = useMemo(() => {
        return breaks.reduce(
            (total, item) => {
                if (
                    !item.startTime ||
                    !item.endTime
                ) {
                    return total;
                }

                return (
                    total +
                    minutesBetween(
                        item.startTime,
                        item.endTime
                    )
                );
            },
            0
        );
    }, [breaks]);

    // =============================================
    // TOTAL WORKING HOURS
    // =============================================
    const totalWorkingMinutes =
        Math.max(
            shiftMinutes - breakMinutes,
            0
        );

    // =============================================
    // UPDATE MAIN FORM
    // =============================================
    const updateForm = (
        field,
        value
    ) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError("");
    };

    // =============================================
    // UPDATE BREAK
    // =============================================
    const updateBreak = (
        id,
        field,
        value
    ) => {
        setBreaks((previous) =>
            previous.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        [field]: value,
                    }
                    : item
            )
        );

        setError("");
    };

    // =============================================
    // ADD BREAK
    // =============================================
    const addBreak = () => {
        setBreaks((previous) => [
            ...previous,

            {
                id:
                    Date.now() +
                    Math.random(),

                title: "",
                startTime: "",
                endTime: "",
            },
        ]);
    };

    // =============================================
    // REMOVE BREAK
    // =============================================
    const removeBreak = (id) => {
        setBreaks((previous) =>
            previous.filter(
                (item) => item.id !== id
            )
        );
    };

    // =============================================
    // VALIDATE
    // =============================================
    const validateForm = () => {
        if (!form.title.trim()) {
            return "Shift title is required.";
        }

        if (!form.timezone) {
            return "Please select a timezone.";
        }

        if (!form.startTime) {
            return "Start time is required.";
        }

        if (!form.endTime) {
            return "End time is required.";
        }

        if (shiftMinutes <= 0) {
            return "Shift duration must be greater than zero.";
        }

        for (let index = 0; index < breaks.length; index += 1) {
            const item = breaks[index];

            const hasAnyBreakValue =
                item.title.trim() ||
                item.startTime ||
                item.endTime;

            if (!hasAnyBreakValue) {
                continue;
            }

            if (!item.title.trim()) {
                return `Break ${index + 1
                    } title is required.`;
            }

            if (
                !item.startTime ||
                !item.endTime
            ) {
                return `Break ${index + 1
                    } start and end time are required.`;
            }
        }

        if (
            breakMinutes >
            shiftMinutes
        ) {
            return "Total break time cannot be greater than shift time.";
        }

        return "";
    };

    // =============================================
    // SAVE SHIFT
    // =============================================
    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        const validationError =
            validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setSaving(true);
            setError("");

            // Remove completely empty break rows
            const cleanedBreaks =
                breaks
                    .filter(
                        (item) =>
                            item.title.trim() ||
                            item.startTime ||
                            item.endTime
                    )
                    .map((item) => ({
                        title:
                            item.title.trim(),

                        startTime:
                            item.startTime,

                        endTime:
                            item.endTime,
                    }));

            const payload = {
                title:
                    form.title.trim(),

                timezone:
                    form.timezone,

                shiftType:
                    form.shiftType,

                startTime:
                    form.startTime,

                endTime:
                    form.endTime,

                breakType:
                    form.breakType,

                breaks:
                    cleanedBreaks,

                status:
                    form.status,
            };

            await axiosInstance.post("/shifts", payload);

            window.alert(
                "Shift created successfully."
            );

            navigate(
                "/admin/scheduler/shifts"
            );
        } catch (requestError) {
            console.error(
                "Create Shift Error:",
                requestError
            );

            setError(
                getApiErrorMessage(requestError, "Unable to create shift.")
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout title="Add Shift">
            <div className="shift-add-page">

                {/* BACK BUTTON */}
                <button
                    type="button"
                    className="shift-back"
                    onClick={() =>
                        navigate(
                            "/admin/scheduler/shifts"
                        )
                    }
                >
                    ← Back
                </button>

                <form
                    className="shift-form-card"
                    onSubmit={handleSubmit}
                >
                    {/* ERROR */}
                    {error && (
                        <div className="admin-error-box">
                            {error}
                        </div>
                    )}

                    {/* SHIFT TITLE */}
                    <div className="shift-form-group">
                        <label>
                            <span>*</span>{" "}
                            Shift title
                        </label>

                        <input
                            type="text"
                            value={form.title}
                            onChange={(event) =>
                                updateForm(
                                    "title",
                                    event.target.value
                                )
                            }
                            placeholder="Enter shift title"
                            disabled={saving}
                        />
                    </div>

                    {/* TIMEZONE */}
                    <div className="shift-form-group">
                        <label>
                            <span>*</span>{" "}
                            Select timezone
                        </label>

                        <select
                            value={
                                form.timezone
                            }
                            onChange={(event) =>
                                updateForm(
                                    "timezone",
                                    event.target.value
                                )
                            }
                            disabled={saving}
                        >
                            <option value="">
                                Select Timezone
                            </option>

                            <option value="Asia/Kolkata">
                                (GMT +5:30)
                                Asia/Kolkata
                            </option>

                            <option value="UTC">
                                UTC
                            </option>

                            <option value="America/New_York">
                                America/New_York
                            </option>

                            <option value="Europe/London">
                                Europe/London
                            </option>
                        </select>
                    </div>

                    {/* SHIFT TYPE */}
                    <div className="shift-radio-row">
                        <strong>
                            <span>*</span>{" "}
                            Shift type
                        </strong>

                        <label>
                            <input
                                type="radio"
                                name="shiftType"
                                value="Fixed"
                                checked={
                                    form.shiftType ===
                                    "Fixed"
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "shiftType",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />

                            Fixed
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="shiftType"
                                value="Flexible"
                                checked={
                                    form.shiftType ===
                                    "Flexible"
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "shiftType",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />

                            Flexible
                        </label>
                    </div>

                    {/* START / END TIME */}
                    <div className="shift-time-row">

                        <div className="shift-form-group">
                            <label>
                                <span>*</span>{" "}
                                Start time
                            </label>

                            <input
                                type="time"
                                value={
                                    form.startTime
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "startTime",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />
                        </div>

                        <div className="shift-form-group">
                            <label>
                                <span>*</span>{" "}
                                End time
                            </label>

                            <input
                                type="time"
                                value={
                                    form.endTime
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "endTime",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />
                        </div>

                        <div className="shift-duration">
                            <label>
                                Duration
                            </label>

                            <strong>
                                {formatDuration(
                                    shiftMinutes
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* BREAK TYPE */}
                    <div className="shift-radio-row">
                        <strong>
                            <span>*</span>{" "}
                            Break &amp; lunch
                        </strong>

                        <label>
                            <input
                                type="radio"
                                name="breakType"
                                value="Fixed"
                                checked={
                                    form.breakType ===
                                    "Fixed"
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "breakType",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />

                            Fixed
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="breakType"
                                value="Flexible"
                                checked={
                                    form.breakType ===
                                    "Flexible"
                                }
                                onChange={(event) =>
                                    updateForm(
                                        "breakType",
                                        event.target.value
                                    )
                                }
                                disabled={saving}
                            />

                            Flexible
                        </label>
                    </div>

                    {/* BREAK ROWS */}
                    {breaks.map(
                        (item, index) => {
                            const duration =
                                minutesBetween(
                                    item.startTime,
                                    item.endTime
                                );

                            return (
                                <div
                                    key={item.id}
                                    className="shift-break-row"
                                >
                                    <strong className="shift-break-number">Break {index + 1}</strong>
                                    {/* BREAK TITLE */}
                                    <div className="shift-form-group">
                                        <label>
                                            Break title
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                item.title
                                            }
                                            onChange={(event) =>
                                                updateBreak(
                                                    item.id,
                                                    "title",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder={`Break ${index + 1
                                                }`}
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>

                                    {/* BREAK START */}
                                    <div className="shift-form-group">
                                        <label>
                                            Start time
                                        </label>

                                        <input
                                            type="time"
                                            value={
                                                item.startTime
                                            }
                                            onChange={(event) =>
                                                updateBreak(
                                                    item.id,
                                                    "startTime",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>

                                    {/* BREAK END */}
                                    <div className="shift-form-group">
                                        <label>
                                            End time
                                        </label>

                                        <input
                                            type="time"
                                            value={
                                                item.endTime
                                            }
                                            onChange={(event) =>
                                                updateBreak(
                                                    item.id,
                                                    "endTime",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>

                                    {/* DURATION */}
                                    <div className="shift-duration">
                                        <label>
                                            Duration
                                        </label>

                                        <strong>
                                            {formatDuration(
                                                duration
                                            )}
                                        </strong>

                                    </div>
                                    {breaks.length > 1 && (
                                        <button
                                            type="button"
                                            className="shift-remove-break"
                                            onClick={() => removeBreak(item.id)}
                                            disabled={saving}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            );
                        }
                    )}

                    {/* ADD BREAK */}
                    <div className="shift-add-break-row">
                        <button
                            type="button"
                            className="add-break-button"
                            onClick={addBreak}
                        >
                            + Add break
                        </button>
                    </div>

                    {/* TOTALS */}
                    <div className="shift-summary">
                        <span>
                            Total working hours:
                            <strong className="working-hours">
                                {" "}
                                {formatDuration(
                                    totalWorkingMinutes
                                )}
                            </strong>
                        </span>

                        <span>
                            Total break hours:
                            <strong className="break-hours">
                                {" "}
                                {formatDuration(
                                    breakMinutes
                                )}
                            </strong>
                        </span>

                        <span>
                            Total hours:
                            <strong>
                                {" "}
                                {formatDuration(
                                    shiftMinutes
                                )}
                            </strong>
                        </span>
                    </div>

                    {/* STATUS */}
                    <div className="shift-form-group shift-status-field">
                        <label>
                            Status
                        </label>

                        <select
                            value={form.status}
                            onChange={(event) =>
                                updateForm(
                                    "status",
                                    event.target.value
                                )
                            }
                            disabled={saving}
                        >
                            <option value="Active">
                                Active
                            </option>

                            <option value="Inactive">
                                Inactive
                            </option>
                        </select>
                    </div>

                    {/* BUTTONS */}
                    <div className="shift-save-row">

                        <button
                            type="button"
                            className="shift-cancel-btn"
                            onClick={() =>
                                navigate(
                                    "/admin/scheduler/shifts"
                                )
                            }
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="shift-save-btn"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Save shift"}
                        </button>

                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default AdminAddShift;
