export default function Legend() {
  return (
    <div id="legend">
      <div className="leg-head">Gesture Map</div>

      <div className="leg-sec">✦ Create — instant</div>
      <div className="leg-row"><span className="leg-em">☝️</span><span className="leg-txt">Index only → Button</span></div>
      <div className="leg-row"><span className="leg-em">✌️</span><span className="leg-txt">Peace → Card</span></div>
      <div className="leg-row"><span className="leg-em">🤘</span><span className="leg-txt">Rock → Input</span></div>
      <div className="leg-row"><span className="leg-em">👍</span><span className="leg-txt">Thumb up → Navbar</span></div>
      <div className="leg-row"><span className="leg-em">🖐</span><span className="leg-txt">Open palm = idle</span></div>

      <div className="leg-sec">✦ Move &amp; Edit</div>
      <div className="leg-row"><span className="leg-em">👌</span><span className="leg-txt">Pinch — grab &amp; drag</span></div>
      <div className="leg-row"><span className="leg-em">↔️</span><span className="leg-txt">Both hands — resize</span></div>

      <div className="leg-sec">✦ Actions</div>
      <div className="leg-row"><span className="leg-em">✊</span><span className="leg-txt">Fist hold — delete</span></div>
      <div className="leg-row"><span className="leg-em">🤙</span><span className="leg-txt">Index+thumb — sync</span></div>
    </div>
  );
}
