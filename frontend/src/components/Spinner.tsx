import '../components/spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function Spinner({ size = 'md', fullScreen = false }: SpinnerProps) {
  if (fullScreen) {
    return (
      <div className="spinner-container--full">
        <div className={`spinner spinner--${size}`} />
      </div>
    );
  }

  return <div className={`spinner spinner--${size}`} />;
}
