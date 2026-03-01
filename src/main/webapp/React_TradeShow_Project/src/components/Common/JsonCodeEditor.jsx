import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

export default function JsonCodeEditor({
  value = '',
  onChange,
  readOnly = false,
  height = '240px',
  className = '',
  placeholder = '{}'
}) {
  const isDark = typeof document !== 'undefined'
    && document.documentElement.getAttribute('data-theme') === 'dark';
  const extensions = useMemo(() => [json()], []);

  return (
    <div className={className}>
      <CodeMirror
        value={String(value ?? '')}
        height={height}
        theme={isDark ? oneDark : 'light'}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          autocompletion: true,
          highlightActiveLine: true
        }}
        placeholder={placeholder}
        onChange={(next) => onChange?.(next)}
      />
    </div>
  );
}
