type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
    </div>
  );
}
