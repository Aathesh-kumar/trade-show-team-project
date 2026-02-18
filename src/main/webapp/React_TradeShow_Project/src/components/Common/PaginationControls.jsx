import styles from '../../styles/index.module.css';

export default function PaginationControls({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  className = ''
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return (
    <div className={`${styles.paginationBar} ${className}`.trim()}>
      <span className={styles.paginationMeta}>Showing {start}-{end} of {totalItems}</span>
      <div className={styles.paginationActions}>
        <button type="button" disabled={!canPrev} onClick={() => canPrev && onPageChange?.(page - 1)}>Prev</button>
        <span className={styles.paginationMeta}>Page {Math.max(1, page)} / {Math.max(1, totalPages)}</span>
        <button type="button" disabled={!canNext} onClick={() => canNext && onPageChange?.(page + 1)}>Next</button>
      </div>
    </div>
  );
}
