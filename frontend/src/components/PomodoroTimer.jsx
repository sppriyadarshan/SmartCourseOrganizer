import React, { useState, useEffect, useCallback } from "react";

const PomodoroTimer = () => {
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [minutes, setMinutes] = useState(focusDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState("Focus"); // Focus or Break

  const switchMode = useCallback(() => {
    if (mode === "Focus") {
      setMode("Break");
      setMinutes(breakDuration);
    } else {
      setMode("Focus");
      setMinutes(focusDuration);
    }
    setSeconds(0);
    setIsActive(false);
  }, [mode, focusDuration, breakDuration]);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            switchMode();
            alert(`${mode} session finished!`);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, mode, switchMode]);

  const updateFocusDuration = (value) => {
    const clamped = Math.max(1, Math.min(60, Number(value)));
    setFocusDuration(clamped);
    if (mode === "Focus") {
      setMinutes(clamped);
      setSeconds(0);
    }
  };

  const updateBreakDuration = (value) => {
    const clamped = Math.max(1, Math.min(30, Number(value)));
    setBreakDuration(clamped);
    if (mode === "Break") {
      setMinutes(clamped);
      setSeconds(0);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setMinutes(mode === "Focus" ? focusDuration : breakDuration);
    setSeconds(0);
  };

  return (
    <div className="pomodoro-card">
      <div className="pomodoro-status">{mode} Mode</div>
      <div className="pomodoro-settings">
        <label>
          Focus Duration (min):
          <div className="spinner-control">
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => updateFocusDuration(focusDuration - 1)}
            >
              -
            </button>
            <input
              type="number"
              value={focusDuration}
              onChange={(e) => updateFocusDuration(e.target.value)}
              min="1"
              max="60"
            />
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => updateFocusDuration(focusDuration + 1)}
            >
              +
            </button>
          </div>
        </label>
        <label>
          Break Duration (min):
          <div className="spinner-control">
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => updateBreakDuration(breakDuration - 1)}
            >
              -
            </button>
            <input
              type="number"
              value={breakDuration}
              onChange={(e) => updateBreakDuration(e.target.value)}
              min="1"
              max="30"
            />
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => updateBreakDuration(breakDuration + 1)}
            >
              +
            </button>
          </div>
        </label>
      </div>
      <div className="pomodoro-timer">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="pomodoro-controls">
        <button
          className={`btn ${isActive ? "btn-outline" : "btn-primary"} btn-sm`}
          onClick={toggleTimer}
          style={{ minWidth: 80 }}
        >
          {isActive ? "⏸ Pause" : "▶ Start"}
        </button>
        <button className="btn btn-outline btn-sm btn-icon" onClick={resetTimer} title="Reset">
          🔄
        </button>
      </div>
    </div>
  );
};

export default PomodoroTimer;
