import { Link } from 'react-router-dom';

export default function PageHeader({ title }) {
  return (
    <header className="subs-dashboard__header">
      <h1>{title}</h1>
      <Link to="/" className="link">
        Back to dashboard
      </Link>
    </header>
  );
}
