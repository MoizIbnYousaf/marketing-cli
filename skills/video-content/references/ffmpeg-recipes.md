# ffmpeg Recipes for Video Content

## Slice Tall Artboard into Slides

```bash
# Input: 2160×26880 @ 2x (7 slides × 3840px)
# Output: 7 PNGs at 1080×1920

IMAGE_WIDTH=2160
SLIDE_HEIGHT=3840  # IMAGE_HEIGHT / SLIDE_COUNT
TARGET_W=1080
TARGET_H=1920

for i in $(seq 0 6); do
  Y=$((i * SLIDE_HEIGHT))
  ffmpeg -i input.png \
    -vf "crop=${IMAGE_WIDTH}:${SLIDE_HEIGHT}:0:${Y},scale=${TARGET_W}:${TARGET_H}" \
    -q:v 2 slides/slide_$((i + 1)).png
done
```

## v1 Quick: Crossfade Stitch

```bash
# 3.5s per slide, 0.5s crossfade, 30fps
ffmpeg \
  -loop 1 -t 3.5 -i slides/slide_1.png \
  -loop 1 -t 3.5 -i slides/slide_2.png \
  -loop 1 -t 3.5 -i slides/slide_3.png \
  -loop 1 -t 3.5 -i slides/slide_4.png \
  -loop 1 -t 3.5 -i slides/slide_5.png \
  -loop 1 -t 3.5 -i slides/slide_6.png \
  -loop 1 -t 3.5 -i slides/slide_7.png \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=3.0[v01];
    [v01][2:v]xfade=transition=fade:duration=0.5:offset=6.0[v02];
    [v02][3:v]xfade=transition=fade:duration=0.5:offset=9.0[v03];
    [v03][4:v]xfade=transition=fade:duration=0.5:offset=12.0[v04];
    [v04][5:v]xfade=transition=fade:duration=0.5:offset=15.0[v05];
    [v05][6:v]xfade=transition=fade:duration=0.5:offset=18.0[v06]
  " \
  -map "[v06]" -r 30 \
  -c:v libx264 -crf 18 -pix_fmt yuv420p \
  -movflags +faststart output_v1.mp4
```

**Offset formula:** `offset_N = offset_(N-1) + slide_duration - fade_duration`

## v1.5 Enhanced: Ken Burns Effect

```bash
# Per-slide: subtle zoom-in with pan
# zoompan: z increases from 1.0 to 1.3 over 4 seconds at 30fps (120 frames)
ffmpeg -loop 1 -t 4 -i slides/slide_1.png \
  -vf "zoompan=z='min(zoom+0.0025,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1080x1920:fps=30" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p slide_1_kb.mp4

# Variation: zoom-out (start zoomed, pull back)
ffmpeg -loop 1 -t 4 -i slides/slide_2.png \
  -vf "zoompan=z='if(eq(on,1),1.3,max(zoom-0.0025,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1080x1920:fps=30" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p slide_2_kb.mp4

# Variation: pan right-to-left
ffmpeg -loop 1 -t 4 -i slides/slide_3.png \
  -vf "zoompan=z='1.2':x='iw*0.2*(1-on/120)':y='ih/2-(ih/zoom/2)':d=120:s=1080x1920:fps=30" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p slide_3_kb.mp4
```

**Stitch Ken Burns clips:**
```bash
ffmpeg \
  -i slide_1_kb.mp4 -i slide_2_kb.mp4 ... \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=3.5[v01];
    ...
  " \
  -map "[vFinal]" output_v1.5_video.mp4
```

## Audio Mixing

```bash
# Add background music at 15% volume
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[1:a]volume=0.15,afade=t=out:st=18:d=2[bg];[0:a][bg]amix=inputs=2:duration=shortest" \
  -c:v copy -c:a aac -b:a 128k mixed.mp4

# If video has no audio track:
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[1:a]volume=0.15,afade=t=out:st=18:d=2[bg]" \
  -map 0:v -map "[bg]" -c:v copy -c:a aac -b:a 128k -shortest mixed.mp4
```

## Post-Processing

```bash
# Two-pass encode for optimal quality/size
ffmpeg -i input.mp4 -c:v libx264 -b:v 4M -pass 1 -f null /dev/null
ffmpeg -i input.mp4 -c:v libx264 -b:v 4M -pass 2 -c:a copy -movflags +faststart final.mp4

# Thumbnail (first frame)
ffmpeg -i final.mp4 -vf "select=eq(n\,0)" -frames:v 1 thumbnail.png

# GIF preview (first 3 seconds, 480px wide, 12fps)
ffmpeg -i final.mp4 -t 3 -vf "fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" preview.gif
```

## Platform-Specific Presets

```bash
# TikTok: 1080x1920, 30fps, H.264, CRF 18, AAC 128k
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -r 30 -s 1080x1920 \
  -c:a aac -b:a 128k -movflags +faststart tiktok.mp4

# Instagram Reels: same as TikTok but max 90s
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -r 30 -s 1080x1920 \
  -t 90 -c:a aac -b:a 128k -movflags +faststart reels.mp4

# Instagram Feed: 1080x1350 (4:5), max 60s
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -r 30 -s 1080x1350 \
  -t 60 -c:a aac -b:a 128k -movflags +faststart feed.mp4

# YouTube Shorts: 1080x1920, 30fps, higher quality CRF 16
ffmpeg -i input.mp4 -c:v libx264 -crf 16 -r 30 -s 1080x1920 \
  -c:a aac -b:a 192k -movflags +faststart shorts.mp4
```
