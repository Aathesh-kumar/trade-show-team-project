import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdInfoOutline, MdCheck, MdClose, MdCheckCircle, MdErrorOutline } from 'react-icons/md';
import { useEffect, useMemo, useState } from 'react';
import CustomDropdown from '../Common/CustomDropdown';

export function SelectField({ label, value, onChange, options }) {
    const normalizedOptions = useMemo(() => (options || []).map((option) => String(option)), [options]);
    const normalizedValue = value == null ? '' : String(value);
    const valueInOptions = normalizedOptions.includes(normalizedValue);
    const [isCustom, setIsCustom] = useState(!valueInOptions);
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        if (valueInOptions) {
            setIsCustom(false);
            setCustomValue('');
            return;
        }
        setIsCustom(true);
        setCustomValue(normalizedValue);
    }, [valueInOptions, normalizedValue]);

    const handleSelectChange = (selectedValue) => {
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
                    <CustomDropdown
                        value={valueInOptions ? normalizedValue : '__custom__'} 
                        onChange={handleSelectChange}
                        options={[
                            ...normalizedOptions.map((option) => ({ value: option, label: option })),
                            { value: '__custom__', label: 'Custom Header Type...' }
                        ]}
                        buttonClassName={ConfigureServerStyles.selectDropdownButton}
                        menuClassName={ConfigureServerStyles.selectDropdownMenu}
                    />
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
                            onChange(normalizedOptions[0] || ''); // Reset to first option
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
