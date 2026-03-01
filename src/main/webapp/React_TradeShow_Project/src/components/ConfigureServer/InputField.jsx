import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import { MdVisibility, MdVisibilityOff, MdLink, MdInfoOutline, MdDns, MdBadge, MdLock, MdVpnKey } from 'react-icons/md';

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
    tooltip,
    readOnly = false
}) {
    const renderIcon = () => {
        if (icon === 'link') return <MdLink />;
        if (icon === 'server') return <MdDns />;
        if (icon === 'client') return <MdBadge />;
        if (icon === 'secret') return <MdLock />;
        if (icon === 'token') return <MdVpnKey />;
        return null;
    };

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
                {icon && (
                    <span className={ConfigureServerStyles.inputIcon}>
                        {renderIcon()}
                    </span>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    readOnly={readOnly}
                    className={`${icon ? ConfigureServerStyles.withIcon : ''} cursor-text`.trim()}
                />
                {showToggle && (
                    <button
                        type="button"
                        className={`${ConfigureServerStyles.toggleBtn} cursor-pointer`}
                        onClick={onToggle}
                    >
                        {type === 'password' ? <MdVisibility /> : <MdVisibilityOff />}
                    </button>
                )}
            </div>
        </div>
    );
}
