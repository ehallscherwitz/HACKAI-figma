export default function Toast({ msg, visible }) {
  return (
    <div id="toast" className={visible ? 'show' : ''}>
      {msg}
    </div>
  );
}
