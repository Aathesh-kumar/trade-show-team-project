import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdInfoOutline } from 'react-icons/md';

export default function DateTimeField({ label, value, onChange, tooltip }) {
    const toLocalValue = (date) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const toLocalInput = (raw) => {
        if (!raw) {
            return '';
        }
        const input = String(raw);
        const match = input.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (match) {
            return `${match[1]}T${match[2]}`;
        }
        if (input.length >= 16 && input.includes('T') && input.includes('Z')) {
            const parsed = new Date(input);
            return Number.isNaN(parsed.getTime()) ? '' : toLocalValue(parsed);
        }
        if (input.length >= 16 && input.includes('T') && !input.includes('Z')) {
            return input.slice(0, 16);
        }
        if (input.includes(' ') || input.includes('T')) {
            const parsed = new Date(input.replace(' ', 'T'));
            return Number.isNaN(parsed.getTime()) ? '' : toLocalValue(parsed);
        }
        return input;
    };

    const setQuickExpiry = (hours) => {
        const d = new Date(Date.now() + hours * 60 * 60 * 1000);
        onChange(toLocalValue(d));
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

            <div className={ConfigureServerStyles.quickSelectButtons}>
                <button type="button" className={ConfigureServerStyles.quickBtn} onClick={() => setQuickExpiry(1)}>+1h</button>
                <button type="button" className={ConfigureServerStyles.quickBtn} onClick={() => setQuickExpiry(6)}>+6h</button>
                <button type="button" className={ConfigureServerStyles.quickBtn} onClick={() => setQuickExpiry(12)}>+12h</button>
                <button type="button" className={ConfigureServerStyles.quickBtn} onClick={() => setQuickExpiry(24)}>+24h</button>
                <button type="button" className={ConfigureServerStyles.quickBtn} onClick={() => onChange('')}>Clear</button>
            </div>

            <div className={ConfigureServerStyles.customDateTime}>
                <input
                    type="datetime-local"
                    value={toLocalInput(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className={ConfigureServerStyles.dateTimeInput}
                />
            </div>
        </div>
    );
}
