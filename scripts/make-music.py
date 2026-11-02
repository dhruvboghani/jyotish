"""Original devotional background music for the reels (synthesised here, so no copyright issues).
   python3 scripts/make-music.py  → static/music/{om-dhyan,bansuri-yaman,shanti}.mp3  (75 s, 44.1 kHz stereo)
   Sa = C# (138.6 Hz). Tanpura with jawari shimmer, temple bells, a bansuri-style flute in Raga Yaman,
   a shruti box drone and singing bowls, all through a soft hall reverb."""
import numpy as np, subprocess, os, sys
from scipy.signal import fftconvolve, butter, sosfilt

SR, DUR = 44100, 75.0
N = int(SR * DUR)
SA = 138.59
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(__file__), '..', 'static', 'music')

def semis(n, base=SA): return base * 2 ** (n / 12)
def env_exp(n, tau): t = np.arange(n) / SR; return np.exp(-t / tau)

def add(buf, sig, start, pan=0.0, gain=1.0):
    i = max(0, int(start * SR))
    if i >= N: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(sig)] += sig * l; buf[1, i:i + len(sig)] += sig * r

def tanpura_pluck(f, length=4.2):
    n = int(SR * length); t = np.arange(n) / SR; s = np.zeros(n)
    for h in range(1, 34):
        fh = f * h * (1 + 0.0004 * h)
        if fh > 9000: break
        base = 1 / h ** 0.75
        # jawari: upper harmonics bloom after the pluck, at different moments
        peak = 0.15 + 0.06 * h; bloom = np.exp(-((t - peak) / (0.35 + 0.02 * h)) ** 2)
        amp = base * (0.35 * np.exp(-t / 2.6) + (0.9 if h > 3 else 0.2) * bloom * np.exp(-t / 3.2))
        s += amp * np.sin(2 * np.pi * fh * t + rng.uniform(0, 6.28))
    s *= np.minimum(1, t / 0.006) * np.exp(-t / 2.4)
    return s / np.max(np.abs(s))

def bell(f, length=7.0, ratios=(1, 2.0, 2.76, 5.40, 8.93), decays=(5.5, 3.5, 2.6, 1.4, 0.8)):
    n = int(SR * length); t = np.arange(n) / SR; s = np.zeros(n)
    for k, (r, d) in enumerate(zip(ratios, decays)):
        s += (0.9 ** k) * np.exp(-t / d) * (np.sin(2 * np.pi * f * r * t) + 0.5 * np.sin(2 * np.pi * (f * r + 0.8) * t))
    s *= np.minimum(1, t / 0.002)
    return s / np.max(np.abs(s))

def bowl(f, length=12.0):
    n = int(SR * length); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + 0.7) * t)) * np.exp(-t / 7)
    s += 0.45 * (np.sin(2 * np.pi * f * 2.71 * t) + np.sin(2 * np.pi * (f * 2.71 + 1.3) * t)) * np.exp(-t / 4)
    s += 0.2 * np.sin(2 * np.pi * f * 5.15 * t) * np.exp(-t / 2)
    s *= np.minimum(1, t / 0.01)
    return s / np.max(np.abs(s))

def flute_note(f, length, nxt=None):
    n = int(SR * length); t = np.arange(n) / SR
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.35) / 0.4, 0, 1)
    freq = f * vib
    if nxt: g = np.clip((t - (length - 0.09)) / 0.09, 0, 1); freq = freq * (1 - g) + nxt * g  # meend into the next note
    ph = 2 * np.pi * np.cumsum(freq) / SR
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    breath = sosfilt(butter(2, [f * 0.8 / (SR / 2), min(0.99, f * 3 / (SR / 2))], 'band', output='sos'), rng.standard_normal(n)) * 0.07
    e = np.minimum(1, t / 0.12) * np.minimum(1, (length - t) / 0.18).clip(0, 1)
    return (tone + breath) * e * 0.6

def shruti(length):
    n = int(SR * length); t = np.arange(n) / SR; s = np.zeros(n)
    for f, a in ((SA, 1), (SA * 1.5, 0.7), (SA * 2, 0.5), (SA / 2, 0.6)):
        for h in range(1, 14): s += a / h * np.sin(2 * np.pi * f * h * (1 + 0.0007 * rng.uniform(-1, 1)) * t + rng.uniform(0, 6.28))
    s = sosfilt(butter(2, 1800 / (SR / 2), output='sos'), s)
    swell = 0.65 + 0.35 * np.sin(2 * np.pi * t / 6.5 - 1.2)  # bellows
    return s / np.max(np.abs(s)) * swell

def reverb(x, seconds=3.2, mix=0.32):
    n = int(SR * seconds); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = rng.standard_normal(n) * np.exp(-t / 0.9); ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
        ir = sosfilt(butter(1, 5000 / (SR / 2), output='sos'), ir); ir /= np.sqrt(np.sum(ir ** 2))
        out[c] = fftconvolve(x[c], ir)[: x.shape[1]]
    return x * (1 - mix) + out * mix

def tanpura_layer(buf, gain=0.5, cycle=4.4):
    strings = [(SA * 0.75, -0.3), (SA, 0.2), (SA, 0.35), (SA / 2, -0.1)]  # Pa Sa Sa Sa(low)
    p = tanpura_pluck  # cache per string
    cache = {f: p(f) for f, _ in strings}
    k, t0 = 0, 0.0
    while t0 < DUR:
        f, pan = strings[k % 4]
        add(buf, cache[f], t0 + rng.uniform(-0.02, 0.02), pan, gain * (1.0 if k % 4 else 0.85))
        t0 += cycle / 4; k += 1

def master(buf, name):
    buf = reverb(buf)
    buf /= np.max(np.abs(buf)) / 0.89
    fade = int(2.5 * SR); buf[:, :int(1.5 * SR)] *= np.linspace(0, 1, int(1.5 * SR)); buf[:, -fade:] *= np.linspace(1, 0, fade)
    os.makedirs(OUT, exist_ok=True)
    raw = (buf.T * 32767).astype('<i2').tobytes()
    path = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '128k', path], input=raw, check=True)
    print('wrote', path, os.path.getsize(path) // 1024, 'KB')

def om_dhyan():
    buf = np.zeros((2, N)); tanpura_layer(buf, 0.55)
    b = bell(semis(24) * 1.5 / 2, 8)  # temple bell around Pa
    for i, t0 in enumerate(np.arange(1.0, DUR - 4, 9.4)): add(buf, b, t0, -0.4 if i % 2 else 0.4, 0.42)
    add(buf, bowl(SA * 2), 0.2, 0, 0.35)
    master(buf, 'om-dhyan')

def bansuri_yaman():
    buf = np.zeros((2, N)); tanpura_layer(buf, 0.38)
    # Raga Yaman (Kalyan thaat): S R G M# P D N, phrases around N R G, G M# D N, M# G R S
    S, R, G, M, P, D, Ni = 12, 14, 16, 18, 19, 21, 23
    phrases = [
        [(Ni - 12, 1.2), (R, 0.9), (G, 2.4)], [(R, 0.8), (G, 0.8), (M, 1.0), (G, 0.8), (R, 1.0), (S, 2.6)],
        [(G, 0.9), (M, 0.9), (D, 1.2), (Ni, 1.0), (D, 0.8), (P, 2.6)], [(M, 0.9), (G, 0.9), (R, 1.1), (G, 1.0), (R, 0.8), (S, 3.0)],
        [(Ni - 12, 1.0), (R, 1.0), (G, 1.0), (M, 1.0), (P, 2.2)], [(D, 0.9), (Ni, 1.0), (S + 12, 2.4), (Ni, 0.9), (D, 0.9), (P, 2.6)],
        [(M, 1.0), (G, 0.9), (R, 1.0), (S, 3.4)]
    ]
    t0 = 3.0
    while t0 < DUR - 6:
        for ph in phrases:
            for j, (n, d) in enumerate(ph):
                nxt = semis(ph[j + 1][0]) if j + 1 < len(ph) else None
                add(buf, flute_note(semis(n), d + 0.05, nxt), t0, 0.1, 0.55); t0 += d
                if t0 > DUR - 6: break
            t0 += 2.2
            if t0 > DUR - 6: break
    ting = bell(2400, 2.5, (1, 2.4, 3.9), (1.2, 0.6, 0.3))
    for t1 in np.arange(2.0, DUR - 3, 8.8): add(buf, ting, t1, 0.5, 0.12); add(buf, ting, t1 + 0.18, -0.5, 0.08)
    master(buf, 'bansuri-yaman')

def shanti():
    buf = np.zeros((2, N))
    add(buf, shruti(DUR), 0, 0, 0.32); tanpura_layer(buf, 0.22, cycle=5.2)
    for i, t0 in enumerate(np.arange(0.5, DUR - 6, 7.2)): add(buf, bowl(SA * (2 if i % 3 else 1.5)), t0, (-0.3, 0.3, 0)[i % 3], 0.5)
    master(buf, 'shanti')

if __name__ == '__main__':
    which = sys.argv[1:] or ['om', 'bansuri', 'shanti']
    if 'om' in which: om_dhyan()
    if 'bansuri' in which: bansuri_yaman()
    if 'shanti' in which: shanti()
