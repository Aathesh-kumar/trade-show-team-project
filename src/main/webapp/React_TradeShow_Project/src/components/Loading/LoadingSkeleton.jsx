import LoadingStyles from '../../styles/Loading.module.css';

export const LoadingSkeleton = ({ 
    lines = 3, 
    type = 'text', 
    height, 
    width 
}) => {
    // Text skeleton
    if (type === 'text') {
        return (
            <div className={LoadingStyles.skeletonContainer}>
                {Array.from({ length: lines }).map((_, index) => (
                    <div 
                        key={index} 
                        className={LoadingStyles.skeletonLine}
                        style={{
                            width: index === lines - 1 ? '70%' : '100%',
                            height: height || '1rem'
                        }}
                    ></div>
                ))}
            </div>
        );
    }

    // Card skeleton
    if (type === 'card') {
        return (
            <div className={LoadingStyles.skeletonCard}>
                <div className={LoadingStyles.skeletonImage}></div>
                <div className={LoadingStyles.skeletonCardContent}>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '60%' }}></div>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '100%' }}></div>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '80%' }}></div>
                </div>
            </div>
        );
    }

    if (type === 'stat-card') {
        return (
            <div className={LoadingStyles.skeletonStatCard}>
                <div className={LoadingStyles.skeletonStatIcon}></div>
                <div className={LoadingStyles.skeletonStatContent}>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '48%', height: '0.8rem' }}></div>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '72%', height: '1.6rem' }}></div>
                    <div className={LoadingStyles.skeletonLine} style={{ width: '56%', height: '0.75rem' }}></div>
                </div>
            </div>
        );
    }

    // Table skeleton
    if (type === 'table') {
        return (
            <div className={LoadingStyles.skeletonTable}>
                {Array.from({ length: lines }).map((_, rowIndex) => (
                    <div key={rowIndex} className={LoadingStyles.skeletonRow}>
                        <div className={LoadingStyles.skeletonCell} style={{ width: '30%' }}></div>
                        <div className={LoadingStyles.skeletonCell} style={{ width: '50%' }}></div>
                        <div className={LoadingStyles.skeletonCell} style={{ width: '20%' }}></div>
                    </div>
                ))}
            </div>
        );
    }

    // Custom skeleton
    return (
        <div 
            className={LoadingStyles.skeletonCustom}
            style={{ height: height || '100px', width: width || '100%' }}
        ></div>
    );
};

export default LoadingSkeleton;
