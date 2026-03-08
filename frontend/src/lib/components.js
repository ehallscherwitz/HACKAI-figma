export const COMP_MAP = {
  index: {
    id: 'button',
    name: 'Button',
    sign: '\u261D\uFE0F',
    figmaType: 'button',
    html: () => '<button class="pre-btn">Click Me</button>',
  },
  peace: {
    id: 'card',
    name: 'Card',
    sign: '\u270C\uFE0F',
    figmaType: 'card',
    html: () =>
      '<div class="pre-card-wrap"><div class="pre-card-title">Card Title</div><div class="pre-card-body">A short description of this card component.</div></div>',
  },
  rock: {
    id: 'input',
    name: 'Input',
    sign: '\uD83E\uDD18',
    figmaType: 'input',
    html: () => '<input class="pre-input" placeholder="Type something..." readonly>',
  },
  thumb: {
    id: 'nav',
    name: 'Navbar',
    sign: '\uD83D\uDC4D',
    figmaType: 'nav',
    html: () =>
      '<div class="pre-nav"><span class="pre-nav-logo">LOGO</span><span class="pre-nav-link">Home</span><span class="pre-nav-link">Work</span><span class="pre-nav-link">About</span></div>',
  },
};

export const GESTURE_TO_COMP = {
  index: COMP_MAP.index,
  peace: COMP_MAP.peace,
  rock: COMP_MAP.rock,
  thumb: COMP_MAP.thumb,
};

export const SCHEMES = ['default', 'sky', 'mint', 'amber', 'rose'];
