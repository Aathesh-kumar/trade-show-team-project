import styles from '../../styles/JsonViewer.module.css';

export default function JsonViewer({ data, className = '' }) {
  const safeData = data ?? {};
  return (
    <pre className={`${styles.jsonViewer} ${className}`.trim()}>
      <code>{renderValue(safeData, 0)}</code>
    </pre>
  );
}

function renderValue(value, indent) {
  if (value === null) {
    return <span className={styles.null}>null</span>;
  }

  if (typeof value === 'string') {
    return <span className={styles.string}>"{escapeText(value)}"</span>;
  }

  if (typeof value === 'number') {
    return <span className={styles.number}>{String(value)}</span>;
  }

  if (typeof value === 'boolean') {
    return <span className={styles.boolean}>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span>[]</span>;
    }

    return (
      <>
        <span>[</span>
        {'\n'}
        {value.map((item, index) => (
          <span key={index}>
            {indentSpaces(indent + 1)}
            {renderValue(item, indent + 1)}
            {index < value.length - 1 ? <span>,</span> : null}
            {'\n'}
          </span>
        ))}
        {indentSpaces(indent)}
        <span>]</span>
      </>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span>{'{}'}</span>;
    }

    return (
      <>
        <span>{'{'}</span>
        {'\n'}
        {entries.map(([key, item], index) => (
          <span key={key}>
            {indentSpaces(indent + 1)}
            <span className={styles.key}>"{escapeText(key)}"</span>
            <span>: </span>
            {renderValue(item, indent + 1)}
            {index < entries.length - 1 ? <span>,</span> : null}
            {'\n'}
          </span>
        ))}
        {indentSpaces(indent)}
        <span>{'}'}</span>
      </>
    );
  }

  return <span className={styles.string}>"{escapeText(String(value))}"</span>;
}

function indentSpaces(count) {
  return '  '.repeat(count);
}

function escapeText(text) {
  return String(text).replace(/"/g, '\\"');
}
