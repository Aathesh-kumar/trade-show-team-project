import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdInfoOutline } from 'react-icons/md';

export default function DateTimeField({ label, value, onChange, tooltip }) {
    const toLocalInput = (raw) => {
        if (!raw) {
            return '';
        }
        const input = String(raw);
        if (input.length >= 16 && input.includes('T')) {
            return input.slice(0, 16);
        }
        return input;
    };

    const setQuickExpiry = (hours) => {
        const d = new Date(Date.now() + hours * 60 * 60 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        onChange(local);
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
