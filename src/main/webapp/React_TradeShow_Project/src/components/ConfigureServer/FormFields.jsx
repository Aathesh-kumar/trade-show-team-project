import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdExpandMore, MdInfoOutline, MdCheck, MdClose, MdCheckCircle, MdErrorOutline } from 'react-icons/md';
import { useState } from 'react';

export function SelectField({ label, value, onChange, options }) {
    const [isCustom, setIsCustom] = useState(false);
    const [customValue, setCustomValue] = useState('');

    const handleSelectChange = (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === '__custom__') {
            setIsCustom(true);
            onChange(customValue || '');
        } else {
            setIsCustom(false);
            onChange(selectedValue);
        }
    };

    const handleCustomInputChange = (e) => {
        const newValue = e.target.value;
        setCustomValue(newValue);
        onChange(newValue);
    };

    return (
        <div className={ConfigureServerStyles.selectField}>
            <label>{label}</label>
            
            {!isCustom ? (
                <div className={ConfigureServerStyles.selectWrapper}>
                    <select 
                        value={options.includes(value) ? value : '__custom__'} 
                        onChange={handleSelectChange}
                    >
                        {options.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="__custom__">Custom Header Type...</option>
                    </select>
                    <MdExpandMore className={ConfigureServerStyles.selectIcon} />
                </div>
            ) : (
                <div className={ConfigureServerStyles.customHeaderWrapper}>
                    <input
                        type="text"
                        placeholder="Enter custom header type (e.g., X-API-Key)"
                        value={customValue}
                        onChange={handleCustomInputChange}
                        className={ConfigureServerStyles.customHeaderInput}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setIsCustom(false);
                            onChange(options[0]); // Reset to first option
                        }}
                        className={ConfigureServerStyles.cancelCustomBtn}
                    >
                        Cancel
                    </button>
                </div>
            )}
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
                <span className={ConfigureServerStyles.sliderValue}>{value}{unit}</span>
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
                    {type === 'success' ? <MdCheckCircle /> : <MdErrorOutline />}
                </span>
                <span className={ConfigureServerStyles.toastMessage}>{message}</span>
            </div>
            <button className={ConfigureServerStyles.toastClose} onClick={onClose}>
                <MdClose />
            </button>
        </div>
    );
}
