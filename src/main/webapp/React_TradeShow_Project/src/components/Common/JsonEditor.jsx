import styles from '../../styles/JsonEditor.module.css';

export default function JsonEditor({ value, onChange, className = '', ...props }) {
  const handleKeyDown = (event) => {
    const textarea = event.target;
    const { selectionStart, selectionEnd } = textarea;
    const currentValue = value || '';

    const pairs = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"'
    };

    if (pairs[event.key]) {
      event.preventDefault();
      const close = pairs[event.key];
      const next = `${currentValue.slice(0, selectionStart)}${event.key}${close}${currentValue.slice(selectionEnd)}`;
      onChange(next);
      queueMicrotask(() => {
        textarea.selectionStart = selectionStart + 1;
        textarea.selectionEnd = selectionStart + 1;
      });
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const next = `${currentValue.slice(0, selectionStart)}  ${currentValue.slice(selectionEnd)}`;
      onChange(next);
      queueMicrotask(() => {
        textarea.selectionStart = selectionStart + 2;
        textarea.selectionEnd = selectionStart + 2;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const before = currentValue.slice(0, selectionStart);
      const after = currentValue.slice(selectionEnd);
      const prevLine = before.split('\n').pop() || '';
      const indentMatch = prevLine.match(/^\s*/);
      const baseIndent = indentMatch ? indentMatch[0] : '';
      const extraIndent = /[[{]\s*$/.test(prevLine) ? '  ' : '';
      const next = `${before}\n${baseIndent}${extraIndent}${after}`;
      const cursor = selectionStart + 1 + baseIndent.length + extraIndent.length;
      onChange(next);
      queueMicrotask(() => {
        textarea.selectionStart = cursor;
        textarea.selectionEnd = cursor;
      });
    }
  };

  return (
    <textarea
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      className={`${styles.jsonEditor} ${className}`.trim()}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
    />
  );
}
