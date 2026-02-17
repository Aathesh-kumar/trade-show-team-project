import { MdInfo, MdLock, MdSettings } from 'react-icons/md';
import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';


const iconMap = {
    info: <MdInfo/>,
    lock: <MdLock/>,
    settings: <MdSettings/>
};

export default function FormSection({ icon, title, children }) {
    return (
        <section className={ConfigureServerStyles.formSection}>
            <h2 className={ConfigureServerStyles.sectionTitle}>
                <span className={ConfigureServerStyles.sectionIcon}>{iconMap[icon]}</span>
                {title}
            </h2>
            <div className={ConfigureServerStyles.sectionContent}>
                {children}
            </div>
        </section>
    );
}