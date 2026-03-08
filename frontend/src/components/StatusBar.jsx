export default function StatusBar({ status, cardCount }) {
  return (
    <div id="statusbar">
      <div className={`stat${status.cam ? ' live' : ''}`}>
        <div className={`dot${status.cam ? ' on' : ''}`} />
        <span>Camera</span>
      </div>
      <div className={`stat${status.mp ? ' live' : ''}`}>
        <div className={`dot${status.mp ? ' on' : ''}`} />
        <span>MediaPipe</span>
      </div>
      <div className={`stat${status.hand ? ' live' : ''}`}>
        <div className={`dot${status.hand ? ' on' : ''}`} />
        <span>Hand</span>
      </div>
      <div className={`stat${status.ws ? ' live' : ''}`}>
        <div className={`dot${status.ws ? ' on' : ''}`} />
        <span>Figma WS</span>
      </div>
      <div className="stat stat-push">
        {cardCount} component{cardCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
