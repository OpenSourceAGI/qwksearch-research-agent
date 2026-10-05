
export const COLORS = {
  mint: '#a4d9bc', blue: '#aac0ec', lavender: '#c6b4e6', peach: '#efc1a7',
  rose: '#e2acbe', teal: '#9fced0', yellow: '#eadb99', grey: '#b9c0be',
};
export function randomCollectionColor(previous) {
  const choices = Object.keys(COLORS).filter(color => !previous || colorHex(color) !== colorHex(previous));
  return choices[Math.floor(Math.random() * choices.length)];
}
export function validColor(value) {
  return Object.hasOwn(COLORS, value || '') || /^#[0-9a-f]{6}$/i.test(value || '');
}
export function colorHex(value) { return COLORS[value] || (/^#[0-9a-f]{6}$/i.test(value || '') ? value : COLORS.blue); }
export function colorInk(value) {
  const hex = colorHex(value).slice(1);
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#17221e' : '#ffffff';
}
export function nativeColor(value) {
  const native = {grey:'#808080',blue:'#4285f4',red:'#ea4335',yellow:'#fbbc04',green:'#34a853',pink:'#ff80ab',purple:'#a142f4',cyan:'#24c1e0',orange:'#fa903e'};
  if (Object.hasOwn(native, value)) return value;
  const rgb = v => [1,3,5].map(i => parseInt(v.slice(i, i+2),16));
  const target = rgb(colorHex(value));
  return Object.entries(native).sort((a,b) => {
    const distance = v => rgb(v).reduce((sum,n,i) => sum + (n-target[i])**2,0);
    return distance(a[1])-distance(b[1]);
  })[0][0];
}
