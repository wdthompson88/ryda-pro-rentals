# RYDA — 15-Second Spot Brief Template

A reusable brief for any AI video generator (Sora, Runway Gen-4,
Pika, Veo, Kling, Luma Dream Machine). Fill the placeholders, paste
the resulting prompts directly into your tool of choice. The
storyboard structure is the same one the autonomous pipeline uses,
so manual and automated outputs cut consistently.

---

## Spot specs (target every output to these)

- **Total length**: 15 seconds
- **Aspect ratio**: 9:16 vertical (1080×1920) for Instagram Reels +
  TikTok + X video; 16:9 horizontal (1920×1080) for YouTube Shorts +
  feed. If the tool only supports one ratio, choose 9:16 — it
  cuts down to landscape better than the reverse.
- **Frame rate**: 30 fps
- **Audio**: usually generate without sound. We add the music bed
  in post (FFmpeg or a simple audio editor).
- **Text**: do NOT generate on-screen text inside the AI video
  output. Burn the overlay in post — AI text gen is unreliable.

---

## Fill these in for each spot

```
Vehicle name (display):     [e.g. "458 Italia"]
Vehicle description (full): [e.g. "2014 Ferrari 458 Italia in Rosso Corsa with cream leather"]
Setting:                    [e.g. "a sunlit Wynwood industrial garage with polished concrete"]
Hook (5-10s overlay):       [e.g. "$32,000 for 1/10"]   max 24 chars
CTA (10-15s overlay):       [e.g. "RYDA · Q3 launch"]   max 32 chars
```

---

## Style preamble (paste at the end of every shot prompt)

```
Style: cinematic editorial commercial. 35mm film aesthetic, natural light,
shallow depth of field, restrained color grade.
No CGI look, no fake reflections, no lens flares, no rapid camera shake,
no on-screen text, no watermarks, no stock-footage feel.
```

---

## Shot 1 — Hero (0-5s)

**For cars:**
> Cinematic hero shot of {vehicleDescription} parked in {setting}.
> Slow push-in from a 3/4 front angle, 50mm lens equivalent. Soft
> directional light, single car visible, no people in frame.
> {style preamble}

**For boats:**
> Cinematic hero shot of {vehicleDescription} moored in {setting}.
> Slow drone push-in from above the bow at low altitude. Calm
> water, single boat visible, no people in frame.
> {style preamble}

---

## Shot 2 — Detail (5-10s)

**For cars:**
> Macro shot of the interior of {vehicleDescription}: hands on the
> steering wheel, gear shifter, instrument cluster lit. Soft
> daylight through the side window. Slow lens drift across the
> leather and metal.
> {style preamble}

**For boats:**
> Macro shot of the helm of {vehicleDescription}: hands on the
> wheel, brightwork and gauges in soft morning light. Slow drift
> across teak decking and chrome fittings.
> {style preamble}

---

## Shot 3 — Kinetic (10-15s)

**For cars:**
> Tracking shot of {vehicleDescription} driving on a coastal road
> at golden hour. Camera mounted at the rear quarter panel, panning
> to follow the car as it accelerates away. Engine sound implied,
> no music.
> {style preamble}

**For boats:**
> Tracking shot of {vehicleDescription} underway on open water at
> golden hour. Camera mounted on a follow boat, capturing the wake
> and the boat from the rear quarter. Spray visible, calm sea.
> {style preamble}

---

## Post-production checklist (after AI gen, before publish)

1. **Trim each clip to exactly 5.0s** — AI tools often return 5.5-7s.
2. **Concatenate** in order: hero → detail → kinetic.
3. **Cross-fade 200ms** between shots so the transitions don't
   feel like hard cuts.
4. **Burn in overlays** (lower third, white text on 45% black box,
   18px box border padding, font size ~4.5% of frame height):
   - 0-5s: `{Vehicle name}`
   - 5-10s: `{Hook}`
   - 10-15s: `{CTA}`
5. **Fade in 250ms / fade out 400ms** — avoids the abrupt-cut feel.
6. **Mix in music bed** at -18 dB — restrained, instrumental,
   ideally licensed. (Royalty-free option: Epidemic Sound, Artlist,
   Musicbed.)
7. **Export H.264, yuv420p, CRF 20, faststart** — these settings
   are what Instagram + X expect; deviating gets your video
   re-encoded with quality loss.

The autonomous pipeline (`scripts/marketing/video/`) handles
steps 1-7 automatically with FFmpeg. This template is for when
you want hands-on artistic control or a quick one-off.

---

## Caption template (Instagram + X)

Pair the video with a caption like:

```
{Vehicle name}. {Hook}. {CTA}.

We don't sell experiences. Members own a real share of a real car—
single-purpose LLC, transparent ops, planned exit at month 36.

#MiamiCars #RYDA #ExoticCars
```

For boats, swap `#ExoticCars` for `#MiamiBoats`.

Caption length: under 220 characters for Instagram (above the fold),
under 240 for X. Hashtags are optional — strong copy beats
hashtag spam every time.
