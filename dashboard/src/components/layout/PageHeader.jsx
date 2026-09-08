export default function PageHeader({ title, description, children }) {
  return <header className="crm-page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="crm-page-actions">{children}</div>}</header>;
}
