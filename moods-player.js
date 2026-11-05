(function () {
  'use strict';
  var player = document.querySelector('[data-moods-player]');
  if (!player) return;
  var audio = player.querySelector('[data-audio]');
  var nowPlaying = player.querySelector('[data-now-playing]');
  var error = player.querySelector('[data-player-error]');
  var tracks = Array.prototype.slice.call(document.querySelectorAll('[data-track-url]'));
  var current = -1;

  function render() {
    tracks.forEach(function (button, index) {
      var playing = index === current && !audio.paused;
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + button.dataset.trackTitle);
      button.querySelector('[data-track-icon]').textContent = playing ? '❚❚' : '▶';
    });
  }
  function play(index) {
    if (index !== current) {
      current = index;
      audio.src = tracks[index].dataset.trackUrl;
      nowPlaying.textContent = tracks[index].dataset.trackTitle;
    }
    error.hidden = true;
    var result = audio.play();
    if (result && result.catch) result.catch(function () { error.hidden = false; render(); });
    render();
  }
  tracks.forEach(function (button, index) {
    button.addEventListener('click', function () {
      if (current === index && !audio.paused) audio.pause();
      else play(index);
    });
  });
  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  audio.addEventListener('error', function () { error.hidden = false; render(); });
  audio.addEventListener('ended', function () { if (current + 1 < tracks.length) play(current + 1); else render(); });
}());
