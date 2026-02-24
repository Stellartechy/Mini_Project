import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaBed } from 'react-icons/fa';
import classNames from 'classnames';

const StatusPanel = ({ status }) => {
    // status: { state: "SAFE" | "WARNING" | "DROWSY", ear, pitch, yaw, is_alert }
    const { state, ear, pitch, yaw } = status;

    const getStatusColor = (s) => {
        switch (s) {
            case "SAFE": return "var(--color-safe)";
            case "WARNING": return "var(--color-warning)";
            case "DROWSY": return "var(--color-danger)";
            default: return "var(--color-text)";
        }
    };

    const getIcon = (s) => {
        switch (s) {
            case "SAFE": return <FaCheckCircle />;
            case "WARNING": return <FaExclamationTriangle />;
            case "DROWSY": return <FaBed />;
            default: return null;
        }
    };

    return (
        <div className={classNames("status-panel", { "status-drowsy": state === "DROWSY" })}>
            <div className="status-header">
                <h2 style={{ color: getStatusColor(state) }}>{state}</h2>
                <div className="status-icon" style={{ color: getStatusColor(state) }}>
                    {getIcon(state)}
                </div>
            </div>

            <div className="metrics-grid">
                <div className="metric-card">
                    <span className="metric-label">EYE ASPECT RATIO</span>
                    <span className="metric-value">{ear?.toFixed(3) || "0.000"}</span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(ear * 100 * 3, 100)}%`, background: ear < 0.25 ? 'var(--color-danger)' : 'var(--color-safe)' }}
                        ></div>
                    </div>
                </div>

                <div className="metric-card">
                    <span className="metric-label">HEAD TILT</span>
                    <span className="metric-value">{pitch?.toFixed(1) || "0.0"}°</span>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(Math.abs(pitch) * 2, 100)}%`, background: pitch < -10 ? 'var(--color-danger)' : 'var(--color-primary)' }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusPanel;
