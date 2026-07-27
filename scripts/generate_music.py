from math import pi, sin
from pathlib import Path
from random import Random
from struct import pack
from wave import open as wave_open


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_RATE = 22_050
DURATION = 36

TRACKS = [
    {
        "file": "evening-code.wav",
        "tempo": 76,
        "seed": 20260725,
        "chords": [(220.00, 261.63, 329.63), (174.61, 220.00, 261.63), (196.00, 246.94, 293.66), (164.81, 207.65, 261.63)],
    },
    {
        "file": "rainy-debug.wav",
        "tempo": 68,
        "seed": 20260726,
        "chords": [(146.83, 174.61, 220.00), (130.81, 164.81, 196.00), (110.00, 146.83, 174.61), (123.47, 155.56, 196.00)],
    },
    {
        "file": "morning-terminal.wav",
        "tempo": 88,
        "seed": 20260727,
        "chords": [(261.63, 329.63, 392.00), (220.00, 277.18, 329.63), (246.94, 311.13, 369.99), (196.00, 261.63, 329.63)],
    },
    {
        "file": "midnight-compile.wav",
        "tempo": 72,
        "seed": 20260728,
        "chords": [(164.81, 196.00, 246.94), (146.83, 185.00, 220.00), (130.81, 164.81, 207.65), (146.83, 174.61, 220.00)],
    },
]


def soft_tone(frequency: float, time: float) -> float:
    return sin(2 * pi * frequency * time) + 0.28 * sin(4 * pi * frequency * time)


def sample_at(time: float, beat: float, chords: list[tuple[float, float, float]], rng: Random) -> float:
    chord = chords[int(time / (beat * 4)) % len(chords)]
    beat_phase = time % beat
    envelope = min(beat_phase / 0.08, 1) * max(0.18, 1 - beat_phase / beat)
    pad = sum(soft_tone(note / 2, time) for note in chord) * 0.055
    bell_note = chord[int(time / beat) % len(chord)] * 2
    bell = soft_tone(bell_note, time) * envelope * 0.075
    bass = sin(2 * pi * chord[0] / 4 * time) * 0.09
    hiss = (rng.random() * 2 - 1) * 0.008
    fade = min(1, time / 2, (DURATION - time) / 2)
    return max(-1, min(1, (pad + bell + bass + hiss) * fade))


output_dir = ROOT / "public" / "audio"
output_dir.mkdir(parents=True, exist_ok=True)

for track in TRACKS:
    output = output_dir / str(track["file"])
    beat = 60 / int(track["tempo"])
    rng = Random(int(track["seed"]))
    chords = track["chords"]
    with wave_open(str(output), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for index in range(SAMPLE_RATE * DURATION):
            value = sample_at(index / SAMPLE_RATE, beat, chords, rng)
            frames.extend(pack("<h", int(value * 32767)))
        audio.writeframes(frames)
    print(output)
