export default function TopBar({ hudInfo, onClear, onSync }) {
  return (
    <div id="topbar">
      <div className="logo">tactile</div>
      <div id="hud">
        <span id="hud-icon">{hudInfo.emoji}</span>
        <span id="hud-text" className={hudInfo.active ? 'active' : ''}>
          {hudInfo.text}
        </span>
      </div>
      <div className="topright">
        <button className="btn ghost" onClick={onClear}>Clear</button>
        <button className="btn" onClick={onSync}>↑ Sync to Figma</button>
      </div>
    </div>
  );
}
