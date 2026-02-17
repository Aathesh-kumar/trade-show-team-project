import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdInfoOutline, MdCalendarToday, MdAccessTime } from 'react-icons/md';
import { useState } from 'react';

export default function DateTimeField({ label, value, onChange, tooltip }) {
    const [useQuickSelect, setUseQuickSelect] = useState(true);

    const formatDateTimeForInput = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleQuickSelect = (hours) => {
        const now = new Date();
        now.setHours(now.getHours() + hours);
        onChange(now.toISOString());
    };

    const handleManualChange = (e) => {
        if (e.target.value) {
            const date = new Date(e.target.value);
            onChange(date.toISOString());
        } else {
            onChange('');
        }
    };

    const getDisplayTime = () => {
        if (!value) return 'Not set';
        const date = new Date(value);
        const now = new Date();
        const diffHours = Math.round((date - now) / (1000 * 60 * 60));
        
        if (diffHours < 0) return 'Expired';
        if (diffHours < 1) return 'Less than 1 hour';
        if (diffHours < 24) return `${diffHours} hours from now`;
        const diffDays = Math.round(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
    };

    return (
        <div className={ConfigureServerStyles.dateTimeField}>
            <label>
                {label}
                {tooltip && (
                    <span className={ConfigureServerStyles.tooltip} title={tooltip}>
                        <MdInfoOutline />
                    </span>
                )}
            </label>

            <div className={ConfigureServerStyles.dateTimeToggle}>
                <button
                    type="button"
                    className={`${ConfigureServerStyles.toggleModeBtn} ${useQuickSelect ? ConfigureServerStyles.active : ''}`}
                    onClick={() => setUseQuickSelect(true)}
                >
                    <MdAccessTime /> Quick Select
                </button>
                <button
                    type="button"
                    className={`${ConfigureServerStyles.toggleModeBtn} ${!useQuickSelect ? ConfigureServerStyles.active : ''}`}
                    onClick={() => setUseQuickSelect(false)}
                >
                    <MdCalendarToday /> Custom Time
                </button>
            </div>

            {useQuickSelect ? (
                <div className={ConfigureServerStyles.quickSelectButtons}>
                    <button
                        type="button"
                        className={ConfigureServerStyles.quickBtn}
                        onClick={() => handleQuickSelect(1)}
                    >
                        1 Hour
                    </button>
                    <button
                        type="button"
                        className={ConfigureServerStyles.quickBtn}
                        onClick={() => handleQuickSelect(24)}
                    >
                        1 Day
                    </button>
                    <button
                        type="button"
                        className={ConfigureServerStyles.quickBtn}
                        onClick={() => handleQuickSelect(168)}
                    >
                        1 Week
                    </button>
                    <button
                        type="button"
                        className={ConfigureServerStyles.quickBtn}
                        onClick={() => handleQuickSelect(720)}
                    >
                        1 Month
                    </button>
                    <button
                        type="button"
                        className={ConfigureServerStyles.quickBtn}
                        onClick={() => onChange('')}
                    >
                        Clear
                    </button>
                </div>
            ) : (
                <div className={ConfigureServerStyles.customDateTime}>
                    <input
                        type="datetime-local"
                        value={formatDateTimeForInput(value)}
                        onChange={handleManualChange}
                        className={ConfigureServerStyles.dateTimeInput}
                        min={formatDateTimeForInput(new Date().toISOString())}
                    />
                </div>
            )}

            {value && (
                <div className={ConfigureServerStyles.expiryPreview}>
                    <span className={ConfigureServerStyles.previewLabel}>Expires in:</span>
                    <span className={ConfigureServerStyles.previewValue}>{getDisplayTime()}</span>
                </div>
            )}
        </div>
    );
}