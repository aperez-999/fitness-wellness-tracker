import { useRef, useState } from "react";

import WorkoutRemoveDialog from "./WorkoutRemoveDialog.jsx";
import Icon from "./Icon.jsx";
import ActivityArt from "./ActivityArt.jsx";
import SavedSessionReveal from "./SavedSessionReveal.jsx";
import WorkoutRowAction from "./WorkoutRowAction.jsx";
import {
  formatWorkoutDate,
  relativeWorkoutDate,
} from "../lib/workoutProgress.js";
import "./workout-list.css";
import "./movement-trail.css";

export default function WorkoutList({
  workouts,
  grouped = false,
  onRepeat,
  repeatDisabled,
  illustrated = false,
  celebration,
  onCelebrated,
}) {
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const container = useRef(null);
  function openAction(workout, mode, trigger) {
    const row = trigger.closest(".session-row").getBoundingClientRect();
    const button = trigger.getBoundingClientRect();
    setAction({
      id: workout._id,
      mode,
      origin: {
        x: button.x + button.width / 2 - row.x,
        y: button.y + button.height / 2 - row.y,
        height: row.height,
      },
    });
  }
  function cancelAction() {
    const { id, mode } = action;
    setAction(null);
    requestAnimationFrame(() =>
      container.current
        ?.querySelector(
          `[data-workout-id="${CSS.escape(id)}"] [data-action="${mode}"]`,
        )
        ?.focus({ preventScroll: true }),
    );
  }
  function finishAction(message) {
    setAction(null);
    setNotice(message);
    container.current
      ?.closest("section[aria-labelledby]")
      ?.querySelector("h2")
      ?.focus({ preventScroll: true });
  }
  const groups = new Map();
  for (const workout of workouts) {
    const date = workout.date.slice(0, 10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(workout);
  }
  return (
    <div
      ref={container}
      className={grouped ? "history-groups" : "journal-groups"}
    >
      <p className="sr-only" role="status">
        {notice}
      </p>
      {illustrated ? (
        <SessionList workouts={workouts} illustrated onRemove={setRemoving} />
      ) : (
        Array.from(groups, ([date, sessions]) => (
          <section
            key={date}
            className={grouped ? "history-group" : "journal-group"}
            aria-label={formatWorkoutDate(date, true)}
          >
            <div
              className={
                grouped ? "history-date-heading" : "journal-date-heading"
              }
            >
              <h3 className={grouped ? "history-date" : "journal-date"}>
                <time dateTime={date}>{relativeWorkoutDate(date)}</time>
              </h3>
              <span>
                {sessions.length}{" "}
                {sessions.length === 1 ? "session" : "sessions"}
                {!grouped && (
                  <>
                    {" "}
                    <GroupMinutes workouts={sessions} />
                  </>
                )}
              </span>
            </div>
            <SessionList
              workouts={sessions}
              grouped={grouped}
              onRepeat={onRepeat}
              repeatDisabled={repeatDisabled}
              onRemove={setRemoving}
              celebration={celebration}
              onCelebrated={onCelebrated}
              action={action}
              onAction={openAction}
              onCancelAction={cancelAction}
              onActionDone={finishAction}
            />
          </section>
        ))
      )}
      {removing && (
        <WorkoutRemoveDialog
          workout={removing}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setNotice(`${removing.name} removed.`);
            setRemoving(null);
            // The removed row cannot receive focus; return to its section heading.
            container.current
              ?.closest("section[aria-labelledby]")
              ?.querySelector("h2")
              ?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}

function GroupMinutes({ workouts }) {
  const recorded = workouts.filter((workout) =>
    Number.isFinite(workout.durationMinutes),
  );
  if (!recorded.length) return null;
  const minutes = recorded.reduce(
    (sum, workout) => sum + workout.durationMinutes,
    0,
  );
  return (
    <span className="journal-group-minutes">
      {new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
        minutes,
      )}{" "}
      min recorded
    </span>
  );
}

function SessionList({
  workouts,
  grouped,
  onRepeat,
  repeatDisabled,
  onRemove,
  illustrated,
  celebration,
  onCelebrated,
  action,
  onAction,
  onCancelAction,
  onActionDone,
}) {
  const maximum = workouts.reduce(
    (max, workout) => Math.max(max, workout.durationMinutes || 0),
    1,
  );
  const Heading = illustrated ? "h3" : "h4";
  return (
    <ul
      className={`session-list ${illustrated ? "movement-trail" : grouped ? "" : "journal-list"}`}
    >
      {workouts.map((workout) => (
        <li
          key={workout._id}
          data-workout-id={workout._id}
          className={`session-row${action?.id === workout._id ? " has-action" : ""}`}
        >
          {action?.id === workout._id ? (
            <WorkoutRowAction
              key={`${workout._id}:${action.mode}`}
              workout={workout}
              mode={action.mode}
              origin={action.origin}
              onCancel={onCancelAction}
              onDone={onActionDone}
            />
          ) : (
            <>
              {illustrated && (
                <WorkoutMeter workout={workout} maximum={maximum} />
              )}
              <div className="session-details">
                {illustrated && (
                  <time
                    className="trail-date"
                    dateTime={workout.date.slice(0, 10)}
                  >
                    {relativeWorkoutDate(workout.date)}
                  </time>
                )}
                <Heading>{workout.name}</Heading>
                {workout.notes && (
                  <details className="session-notes">
                    <summary>
                      {grouped ? (
                        <>
                          Notes
                          <span className="sr-only"> for {workout.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="note-preview" aria-hidden="true">
                            {workout.notes}
                          </span>
                          <span className="note-open" aria-hidden="true">
                            Read note
                          </span>
                          <span className="note-close" aria-hidden="true">
                            Hide note
                          </span>
                          <span className="sr-only">
                            Notes for {workout.name}
                          </span>
                        </>
                      )}
                    </summary>
                    <p>{workout.notes}</p>
                  </details>
                )}
              </div>
              <span className="session-duration">
                {Number.isFinite(workout.durationMinutes)
                  ? `${workout.durationMinutes} min`
                  : "Not recorded"}
              </span>
              <div className="session-actions">
                {onRepeat && (
                  <button
                    type="button"
                    className="session-repeat"
                    onClick={() => onRepeat(workout)}
                    disabled={repeatDisabled}
                    aria-label={`Log ${workout.name} again`}
                  >
                    Log again
                  </button>
                )}
                {grouped && (
                  <button
                    type="button"
                    data-action="edit"
                    className="session-remove"
                    aria-label={`Edit ${workout.name}`}
                    title={`Edit ${workout.name}`}
                    disabled={repeatDisabled}
                    onClick={(event) =>
                      onAction(workout, "edit", event.currentTarget)
                    }
                  >
                    <Icon name="edit" size={17} />
                  </button>
                )}
                <button
                  type="button"
                  className="session-remove"
                  data-action="remove"
                  aria-label={`Remove ${workout.name}`}
                  title={`Remove ${workout.name}`}
                  disabled={repeatDisabled}
                  onClick={(event) =>
                    grouped
                      ? onAction(workout, "remove", event.currentTarget)
                      : onRemove(workout)
                  }
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
              {celebration?.id === workout._id && (
                <SavedSessionReveal
                  message={celebration.message}
                  onFinished={onCelebrated}
                />
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function WorkoutMeter({ workout, maximum }) {
  // Artwork is decorative; custom names retain their original labels below.
  const matches = [
    ["Walk", /\b(walk|walking|hike|hiking)\b/i],
    ["Run", /\b(run|running|jog)\b/i],
    ["Cycle", /\b(cycle|cycling|bike)\b/i],
    ["Strength", /\b(strength|weights|lifting)\b/i],
    ["Mobility", /\b(mobility|yoga|stretch)\b/i],
  ];
  const activity =
    matches.find(([, pattern]) => pattern.test(workout.name))?.[0] || "Custom";
  return (
    <div className="trail-meter" aria-hidden="true">
      <div
        className="trail-bar"
        style={{
          "--duration-height": `${((workout.durationMinutes || 0) / maximum) * 42}px`,
        }}
      >
        <ActivityArt activity={activity} />
      </div>
    </div>
  );
}
