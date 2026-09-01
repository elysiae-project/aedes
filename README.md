# Aedes

Aedes is the Elysiae Project's api endpoint which provides:

1. Optimised assets from the games supported by the Elysiae launcher (all supported locales).
2. Custom components the Elysiae launcher requires to play games

Unifying optimized assets and components into one custom endpoint results in a significantly smaller endpoint transfer size and a smaller download size for all of the visual assets that the Elysiae launcher displays. These transfer reductions are not much, but they should add up over time.

## Asset optimisations applied

### Videos

- Change colour space from gbr to rgb (additionally allows for hardware accelerated playback)
- Switch codec from vp9 to h264
- Convert to mp4 from webm
- Optimize videos for the content that they play

### Images

- Apply compression to reduce file size
- Convert to png if the image was originally a webp image

## Aedes API

TODO

## Legal

The Elysiae project is *not* the copyright holder for the assets provided through the endpoint. Assets are obtained through legal web scraping and are additionally re-distributions of widely available public material.

Components re-distributed by Aedes are done so under their respective binary redistribution terms.

Aedes is licensed under the AGPLv3 license. Please follow the license if you are creating a fork or redistributing the Aedes source code.
