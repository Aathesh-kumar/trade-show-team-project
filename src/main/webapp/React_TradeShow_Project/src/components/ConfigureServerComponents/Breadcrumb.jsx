import { MdArrowForwardIos } from 'react-icons/md';
import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';

export default function Breadcrumb({ items }) {
    return (
        <nav className={ConfigureServerStyles.breadcrumb}>
            {items.map((item, index) => (
                <span key={index} className={ConfigureServerStyles.breadcrumbItem}>
                    {item.path && !item.active ? (
                        <a href={item.path}>{item.label}</a>
                    ) : (
                        <span className={item.active ? ConfigureServerStyles.active : ''}>
                            {item.label}
                        </span>
                    )}
                    {index < items.length - 1 && (
                        <span className={ConfigureServerStyles.separator}>{<MdArrowForwardIos/>}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}