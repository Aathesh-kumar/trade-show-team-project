import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdExpandMore, MdInfoOutline, MdCheck, MdClose } from 'react-icons/md';

export function SelectField({ label, value, onChange, options }) {
    return (
        <div className={ConfigureServerStyles.selectField}>
            <label>{label}</label>
            <div className={ConfigureServerStyles.selectWrapper}>
                <select value={value} onChange={(e) => onChange(e.target.value)}>
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <MdExpandMore className={ConfigureServerStyles.selectIcon} />
            </div>
        </div>
    );
}

export function SliderField({ label, value, onChange, min, max, step, unit, tooltip }) {
    return (
        <div className={ConfigureServerStyles.sliderField}>
            <div className={ConfigureServerStyles.sliderHeader}>
                <label>
                    {label}
                    {tooltip && (
                        <span className={ConfigureServerStyles.tooltip} title={tooltip}>
                            <MdInfoOutline />
                        </span>
                    )}
                </label>
                <span className={ConfigureServerStyles.sliderValue}>{value.toLocaleString()} {unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className={ConfigureServerStyles.slider}
            />
        </div>
    );
}

export function ToggleField({ label, description, checked, onChange }) {
    return (
        <div className={ConfigureServerStyles.toggleField}>
            <div className={ConfigureServerStyles.toggleInfo}>
                <div className={ConfigureServerStyles.toggleCheck}>
                    <MdCheck />
                </div>
                <div>
                    <strong>{label}</strong>
                    <p>{description}</p>
                </div>
            </div>
            <label className={ConfigureServerStyles.toggleSwitch}>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className={ConfigureServerStyles.toggleSlider}></span>
            </label>
        </div>
    );
}

export function Toast({ type, message, onClose }) {
    return (
        <div className={`${ConfigureServerStyles.toast} ${ConfigureServerStyles[type]}`}>
            <div className={ConfigureServerStyles.toastContent}>
                <span className={ConfigureServerStyles.toastIcon}>
                    {type === 'success' ? <MdCheck/> : <MdClose/> }
                </span>
                <span className={ConfigureServerStyles.toastMessage}>{message}</span>
            </div>
            <button className={ConfigureServerStyles.toastClose} onClick={onClose}>
                <MdClose />
            </button>
        </div>
    );
}