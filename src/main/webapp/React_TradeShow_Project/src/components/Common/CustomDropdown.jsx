import { useEffect, useMemo, useRef, useState } from 'react';
import { MdExpandMore } from 'react-icons/md';
import styles from '../../styles/CustomDropdown.module.css';

export default function CustomDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  optionClassName = ''
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const normalized = useMemo(
    () => options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt)),
    [options]
  );

  const selected = normalized.find((opt) => String(opt.value) === String(value));

  return (
    <div className={`${styles.dropdown} ${className}`.trim()} ref={rootRef}>
      {label ? <label className={styles.label}>{label}</label> : null}
      <button
        type="button"
        className={`${styles.trigger} ${buttonClassName} cursor-pointer`.trim()}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label || placeholder}</span>
        <MdExpandMore className={`${styles.icon} ${open ? styles.iconOpen : ''}`} />
      </button>
      {open ? (
        <div className={`${styles.menu} ${menuClassName}`.trim()}>
          {normalized.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              className={`${styles.option} ${String(opt.value) === String(value) ? styles.optionActive : ''} ${optionClassName} cursor-pointer`.trim()}
              onClick={() => {
                onChange?.(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
