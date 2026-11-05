const release = 'https://github.com/3thousand30/3thousand30-website/releases/download/moods-audio-v1';
const groups = [
  ['Love', ['Joyful Beginnings', 'Tender Reverie', 'Close to You']],
  ['Humour', ['Playful Steps', 'Mischief in Motion', 'A Little Detour']],
  ['Sorrow', ['A Quiet Goodbye', 'Echoes of Yesterday', 'After the Rain']],
  ['Anger', ['Under Pressure', 'Fire Beneath', 'Controlled Fury']],
  ['Courage', ['Rising', 'Quiet Resolve', 'Forward Together']],
  ['Fear', ['In the Shadows', 'What Lies Ahead', 'Unseen Presence']],
  ['Disgust', ['Uneasy Truth', 'Crooked Smile', 'Bitter Aftertaste']],
  ['Wonder', ['First Discovery', 'Beyond the Stars', 'Endless Horizons']],
  ['Peace', ['Still Waters', 'Quiet Moments', 'Gentle Flow']]
];
let number = 0;
module.exports = {
  download: `${release}/Moods-album.zip`,
  groups: groups.map(([mood, titles]) => ({
    mood,
    tracks: titles.map(title => {
      number += 1;
      const id = String(number).padStart(2, '0');
      return { id, title: `${mood} - ${title}`, url: `${release}/moods-${id}.mp3` };
    })
  }))
};
