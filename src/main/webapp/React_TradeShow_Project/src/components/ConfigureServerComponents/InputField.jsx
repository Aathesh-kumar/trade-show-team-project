import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdVisibility, MdVisibilityOff, MdLink, MdInfoOutline } from 'react-icons/md';

export default function InputField({ 
    label, 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    required, 
    icon,
    showToggle,
    onToggle,
    tooltip
}) {
    return (
        <div className={ConfigureServerStyles.inputField}>
            <label>
                {label}
                {required && <span className={ConfigureServerStyles.required}>*</span>}
                {tooltip && (
                    <span className={ConfigureServerStyles.tooltip} title={tooltip}>
                        <MdInfoOutline />
                    </span>
                )}
            </label>
            <div className={ConfigureServerStyles.inputWrapper}>
                {icon === 'link' && (
                    <span className={ConfigureServerStyles.inputIcon}>
                        <MdLink />
                    </span>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    className={icon ? ConfigureServerStyles.withIcon : ''}
                />
                {showToggle && (
                    <button
                        type="button"
                        className={ConfigureServerStyles.toggleBtn}
                        onClick={onToggle}
                    >
                        {type === 'password' ? <MdVisibility /> : <MdVisibilityOff />}
                    </button>
                )}
            </div>
        </div>
    );
}