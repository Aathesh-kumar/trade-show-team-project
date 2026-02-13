import AsideStyles from '../styles/Aside.module.css';

export default function AsideItem({ icon, children, active = false, onClick }) {
    return (
        <div 
            className={`${AsideStyles.asideItem} ${active ? AsideStyles.active : ''}`}
            onClick={onClick}
        >
            <div className={AsideStyles.asideIcon}>{icon}</div>
            <h3 className={AsideStyles.asideLabel}>{children}</h3>
        </div>
    );
}