import LoadingStyles from '../../styles/Loading.module.css';


export const LoadingSpinner = ({ 
    size = 'medium', 
    color, 
    text = 'Loading...', 
    fullScreen = false 
}) => {
    const spinnerClass = `${LoadingStyles.spinner} ${LoadingStyles[size]}`;
    
    const content = (
        <div className={LoadingStyles.spinnerContainer}>
            <div className={spinnerClass} style={color ? { borderTopColor: color } : {}}></div>
            {text && <p className={LoadingStyles.loadingText}>{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className={LoadingStyles.fullScreenOverlay}>
                {content}
            </div>
        );
    }

    return content;
};

export default LoadingSpinner;