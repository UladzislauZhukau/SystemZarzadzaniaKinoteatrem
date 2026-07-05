# Background music

The navbar music toggle plays the file at:

    frontend/public/music/moonlight-haze.mp3

This file is **not** checked in (it's third-party audio). Add it yourself:

1. Download **"Moonlight Haze" by Bird Creek** — it's a free track from the
   YouTube Audio Library (https://www.youtube.com/audiolibrary), no attribution
   required.
2. Save it as `moonlight-haze.mp3` in this folder.

Vite serves everything under `public/` from the site root, so the app loads it
from `/music/moonlight-haze.mp3` (see `src/components/MusicPlayer.jsx`).

To use a different song, drop in another file and update `MUSIC_SRC` in
`MusicPlayer.jsx`. If the file is missing, the toggle simply plays nothing —
nothing else breaks.
