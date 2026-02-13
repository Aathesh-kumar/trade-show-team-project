import LoadingStyles from '../styles/Loading.module.css';

export const LoadingDots = ({ color, text = 'Loading' }) => {
    return (
        <div className={LoadingStyles.dotsContainer}>
            {text && <span className={LoadingStyles.dotsText}>{text}</span>}
            <div className={LoadingStyles.dots}>
                <div 
                    className={LoadingStyles.dot} 
                    style={color ? { backgroundColor: color } : {}}
                ></div>
                <div 
                    className={LoadingStyles.dot} 
                    style={color ? { backgroundColor: color } : {}}
                ></div>
                <div 
                    className={LoadingStyles.dot} 
                    style={color ? { backgroundColor: color } : {}}
                ></div>
            </div>
        </div>
    );
};

export default LoadingDots;