export default function ReportSummary({ items }) {
  return <section className="crm-stat-strip" aria-label="Report summary">{items.map(item => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.help || "Selected report period"}</small></article>)}</section>;
}
