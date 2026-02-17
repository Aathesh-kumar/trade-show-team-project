import LoadingStyles from '../../styles/Loading.module.css';

export const LoadingPulse = ({ size = 'medium', color }) => {
    return (
        <div className={LoadingStyles.pulseContainer}>
            <div 
                className={`${LoadingStyles.pulse} ${LoadingStyles[`pulse-${size}`]}`}
                style={color ? { backgroundColor: color } : {}}
            ></div>
        </div>
    );
};

export default LoadingPulse;