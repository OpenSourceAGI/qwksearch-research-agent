
// Load the optional YouTube player only in response to a visitor's click.
(() => {
  const trigger = document.querySelector('[data-video-id]');
  const dialog = document.querySelector('#video-dialog');
  const player = document.querySelector('#video-player');
  const close = dialog?.querySelector('.video-close');
  if (!trigger || !player || !close || typeof dialog.showModal !== 'function') return;
  const id = trigger.dataset.videoId;
  if (!/^[\w-]{11}$/.test(id)) return;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);

  trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dialog.open) return;
    const frame = document.createElement('iframe');
    frame.title = 'LeoTabs product video';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    // YouTube requires an identifying referrer; override the site's no-referrer default.
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    dialog.showModal();
    document.documentElement.classList.add('video-open');
    player.replaceChildren(frame);
    close.focus();
  });
  const cleanUp = () => {
    player.replaceChildren();
    document.documentElement.classList.remove('video-open');
    trigger.focus({ preventScroll: true });
  };
  const dismiss = () => {
    dialog.close();
    cleanUp();
  };
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    dismiss();
  });
  dialog.addEventListener('close', () => {
    // A queued close event must not remove a player that was just reopened.
    if (!dialog.open) cleanUp();
  });
  // Avoid closing when a pointer drag starts in the player and ends outside it.
  const outside = event => {
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  };
  let backdropPress = false;
  dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outside(event); });
  dialog.addEventListener('pointerup', event => {
    if (backdropPress && event.target === dialog && outside(event)) dismiss();
    backdropPress = false;
  });
})();
